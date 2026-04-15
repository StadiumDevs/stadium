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

async function verifyBountyAmounts() {
  console.log('Verifying bounty amounts match CSV source of truth...');
  
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
          
          let matchedCount = 0;
          let mismatchCount = 0;
          const mismatches = [];
          
          // For each bounty prize, find matching CSV row and compare amounts
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
              
              if (prize.amount === csvAmount) {
                matchedCount++;
              } else {
                mismatchCount++;
                mismatches.push({
                  project: prize.project_name,
                  bounty: prize.bounty_name,
                  supabaseAmount: prize.amount,
                  csvAmount: csvAmount
                });
              }
            }
          }
          
          console.log('\n=== VERIFICATION RESULTS ===');
          console.log(`Matched amounts: ${matchedCount}`);
          console.log(`Mismatched amounts: ${mismatchCount}`);
          
          if (mismatchCount > 0) {
            console.log('\n=== MISMATCHES FOUND ===');
            mismatches.forEach(mismatch => {
              console.log(`${mismatch.project} - ${mismatch.bounty}: Supabase=$${mismatch.supabaseAmount}, CSV=$${mismatch.csvAmount}`);
            });
            console.log('\n❌ Bounty amounts DO NOT match CSV. The fix script needs to be run.');
          } else {
            console.log('\n✅ All bounty amounts match the CSV source of truth.');
          }
          
          resolve({ matched: matchedCount, mismatched: mismatchCount, mismatches });
          
        } catch (error) {
          console.error('Error verifying bounty amounts:', error);
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
  verifyBountyAmounts()
    .then((result) => {
      console.log('\nVerification completed successfully');
      process.exit(result.mismatched > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = verifyBountyAmounts;
