const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBountyAmounts() {
  console.log('Starting bounty amount correction from CSV...');
  
  // Read the CSV file
  const csvPath = path.join(__dirname, '../migration-data/payouts.csv');
  const csvData = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        csvData.push(row);
      })
      .on('end', async () => {
        console.log(`Read ${csvData.length} rows from CSV`);
        
        try {
          // Get all bounty prizes from Supabase
          const { data: bountyPrizes, error: fetchError } = await supabase
            .from('bounty_prizes')
            .select('*');
            
          if (fetchError) {
            throw fetchError;
          }
          
          console.log(`Found ${bountyPrizes.length} bounty prizes in Supabase`);
          
          let updatedCount = 0;
          
          // For each bounty prize, find matching CSV row and update amount
          for (const prize of bountyPrizes) {
            // Find matching CSV row by project name and bounty type
            const csvRow = csvData.find(row => {
              const projectNameMatch = row.project_name && 
                prize.project_name && 
                row.project_name.trim().toLowerCase() === prize.project_name.trim().toLowerCase();
              
              const bountyMatch = row.bounty_name && 
                prize.bounty_name && 
                row.bounty_name.trim().toLowerCase() === prize.bounty_name.trim().toLowerCase();
                
              return projectNameMatch && bountyMatch;
            });
            
            if (csvRow && csvRow.amount) {
              const csvAmount = parseFloat(csvRow.amount.replace(/[$,]/g, ''));
              
              if (prize.amount !== csvAmount) {
                console.log(`Updating ${prize.project_name} - ${prize.bounty_name}: $${prize.amount} -> $${csvAmount}`);
                
                const { error: updateError } = await supabase
                  .from('bounty_prizes')
                  .update({ amount: csvAmount })
                  .eq('id', prize.id);
                  
                if (updateError) {
                  console.error(`Error updating prize ${prize.id}:`, updateError);
                } else {
                  updatedCount++;
                }
              }
            } else {
              console.log(`No CSV match found for: ${prize.project_name} - ${prize.bounty_name}`);
            }
          }
          
          console.log(`\nCompleted! Updated ${updatedCount} bounty prize amounts.`);
          resolve();
          
        } catch (error) {
          console.error('Error processing bounty amounts:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

if (require.main === module) {
  fixBountyAmounts()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = fixBountyAmounts;
