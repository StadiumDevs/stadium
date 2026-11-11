import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { NETWORKS, type PayoutDetails, type PayoutDetailsInput, type PayoutNetwork } from "@/lib/payouts";

const field = "w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5";

/**
 * Payout details: legal name, country of tax residence, USDC network and
 * address (entered again to confirm; pasting is fine), and a "double-checked" tick. Used by the winner's
 * card and the admin's edit. `asAdmin` skips the repeat and the tick.
 */
export function PayoutDetailsForm({
  networks,
  currency,
  initial,
  asAdmin = false,
  saving,
  onSave,
  onCancel,
}: {
  networks: PayoutNetwork[];
  currency: string;
  initial: PayoutDetails | null;
  asAdmin?: boolean;
  saving: boolean;
  onSave: (input: PayoutDetailsInput) => void;
  onCancel?: () => void;
}) {
  const [legalName, setLegalName] = useState(initial?.legalName ?? "");
  const [taxCountry, setTaxCountry] = useState(initial?.taxCountry ?? "");
  // One network (Ethereum): chosen for the winner.
  const [network, setNetwork] = useState(initial?.network ?? (networks.length === 1 ? networks[0].id : ""));
  const [address, setAddress] = useState(initial?.address ?? "");
  const [addressConfirm, setAddressConfirm] = useState(asAdmin ? initial?.address ?? "" : "");
  const [confirmed, setConfirmed] = useState(asAdmin);
  const n = network ? NETWORKS[network] : null;
  const label = networks.find((x) => x.id === network)?.label ?? n?.label ?? "the network";
  const looksWrong = !!(n && address.trim() && !n.isAddress(address.trim()));
  const mismatch = !asAdmin && !!addressConfirm && addressConfirm.trim() !== address.trim();
  const ready = legalName.trim() && taxCountry && network && address.trim() && !looksWrong && (asAdmin || (addressConfirm.trim() === address.trim() && confirmed));

  return (
    <form
      className="space-y-2"
      data-testid="payout-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSave({ legalName, taxCountry, network, address: address.trim(), addressConfirm: asAdmin ? address.trim() : addressConfirm.trim(), confirmed });
      }}
    >
      <label className="block space-y-1">
        <span className="label-hw-dim">LEGAL NAME</span>
        <input className={field} value={legalName} onChange={(e) => setLegalName(e.target.value)} autoComplete="name" data-testid="payout-legal-name" />
      </label>
      <label className="block space-y-1">
        <span className="label-hw-dim">COUNTRY OF TAX RESIDENCE</span>
        <select className={field} value={taxCountry} onChange={(e) => setTaxCountry(e.target.value)} data-testid="payout-country">
          <option value="">Choose…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="label-hw-dim">{currency} NETWORK</span>
        <select className={field} value={network} onChange={(e) => setNetwork(e.target.value)} data-testid="payout-network">
          <option value="">Choose…</option>
          {networks.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="label-hw-dim">
          {currency} ADDRESS ON {label.toUpperCase()}
        </span>
        <input
          className={field}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={n?.addressHint ?? ""}
          spellCheck={false}
          autoComplete="off"
          data-testid="payout-address"
        />
        {looksWrong && <span className="block text-[11px] text-warn">That doesn't look like an address on {label} ({n?.addressHint}).</span>}
      </label>
      {!asAdmin && (
        <>
          <label className="block space-y-1">
            <span className="label-hw-dim">CONFIRM ADDRESS</span>
            <input
              className={field}
              value={addressConfirm}
              onChange={(e) => setAddressConfirm(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Paste or type the same address"
              data-testid="payout-address-confirm"
            />
            {mismatch && <span className="block text-[11px] text-warn">The two addresses don't match.</span>}
          </label>
          <label className="flex items-start gap-2 text-[12px] text-body">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" data-testid="payout-confirm" />
            <span>
              This address is on {label} and I've double-checked it. A payment sent to the address I give can't be recovered.
            </span>
          </label>
        </>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!ready || saving}
          className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell disabled:opacity-50 px-3 py-1.5"
          data-testid="payout-save"
        >
          {saving ? "SAVING…" : "SAVE PAYOUT DETAILS"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display px-3 py-1.5">
            CANCEL
          </button>
        )}
      </div>
    </form>
  );
}
