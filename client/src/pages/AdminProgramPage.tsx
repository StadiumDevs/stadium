import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { HardwareToggle } from "@/components/hardware-toggle";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { isAdmin as checkIsAdmin, ADMIN_ADDRESSES } from "@/lib/constants";
import {
  api,
  type ApiProgram,
  type ApiProgramApplication,
  ApiError,
} from "@/lib/api";
import { ApplicationCard } from "@/components/admin/ApplicationCard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Filter = ApiProgramApplication["status"] | "all";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "submitted", label: "SUBMITTED" },
  { value: "accepted", label: "ACCEPTED" },
  { value: "rejected", label: "REJECTED" },
  { value: "withdrawn", label: "WITHDRAWN" },
  { value: "all", label: "ALL" },
];

const PROGRAM_TYPE_LABEL: Record<ApiProgram["programType"], string> = {
  dogfooding: "DOGFOODING",
  pitch_off: "PITCH-OFF",
  hackathon: "HACKATHON",
  m2_incubator: "M2 INCUBATOR",
};

const AdminProgramPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const auth = useWalletAuth();
  const connectedAddress = auth.account?.address ?? null;
  const isAdminWallet = checkIsAdmin(connectedAddress ?? undefined, auth.account?.chain);

  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [applications, setApplications] = useState<ApiProgramApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [filter, setFilter] = useState<Filter>("submitted");
  const [errorData, setErrorData] = useState<{
    walletAddresses: string[];
    expectedAddresses: string[];
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .getProgramBySlug(slug)
      .then((r) => { if (active) setProgram(r.data); })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const loadApplications = async () => {
    if (!slug || !connectedAddress || !isAdminWallet) return;
    try {
      const authHeader = await auth.signAction("admin-action");
      const res = await api.listProgramApplications(slug, authHeader);
      setApplications(res.data);
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't load applications",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const connectWallet = async () => {
    setErrorData(null);
    try {
      const found = await auth.connect();
      const admin = found.find((a) => checkIsAdmin(a.address, a.chain));
      if (!admin) {
        setErrorData({
          walletAddresses: found.map((a) => a.address),
          expectedAddresses: ADMIN_ADDRESSES.filter((e) => e.chain === auth.chain).map((e) => e.address),
        });
        return;
      }
      auth.selectAccount(admin);
    } catch (e) {
      toast({
        title: "Couldn't connect wallet",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const handleUpdated = (next: ApiProgramApplication) => {
    setApplications((prev) => prev.map((a) => (a.id === next.id ? next : a)));
  };

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            to="/admin"
            className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
          >
            ◂ BACK TO ADMIN
          </Link>
        </div>

        {loading ? (
          <div className="panel px-4 py-10 text-center label-hw-dim">Reading program…</div>
        ) : notFound ? (
          <div className="panel px-4 py-10 max-w-lg mx-auto text-center">
            <div className="label-hw text-display mb-2">·PROGRAM NOT FOUND</div>
            <Link
              to="/admin"
              className="inline-block mt-3 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
            >
              ◂ BACK TO ADMIN
            </Link>
          </div>
        ) : program ? (
          <>
            <header className="mb-6">
              <div className="label-hw-dim mb-2">·ADMIN / PROGRAM / {PROGRAM_TYPE_LABEL[program.programType]}</div>
              <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight text-display leading-[0.95] mb-3">
                {program.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="lcd inline-flex items-center gap-2 px-3 py-1.5">
                  <span className={cn("led led-sm", program.status === "open" && "led-pulse")} aria-hidden="true" />
                  <span className="label-hw text-display">{program.status.toUpperCase()}</span>
                </div>
                {program.location && <span className="label-hw-dim">{program.location.toUpperCase()}</span>}
              </div>
            </header>

            {!isAdminWallet ? (
              <div className="panel p-6">
                <div className="label-hw text-display mb-3">·ADMIN WALLET REQUIRED</div>
                <p className="text-body text-sm mb-4">
                  Connect a wallet whose address is in <code className="text-display">VITE_ADMIN_ADDRESSES</code> to
                  review applications.
                </p>
                <button
                  type="button"
                  onClick={connectWallet}
                  disabled={auth.isConnecting}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
                >
                  {auth.isConnecting ? "CONNECTING…" : "CONNECT ADMIN WALLET"}
                </button>
                {errorData && (
                  <div className="mt-4 lcd p-3 space-y-2">
                    <div className="label-hw text-destructive">·NOT AN ADMIN</div>
                    {errorData.walletAddresses.length > 0 && (
                      <div>
                        <div className="label-hw-dim mb-1">Your wallet addresses:</div>
                        <ul className="space-y-1">
                          {errorData.walletAddresses.map((a, i) => (
                            <li key={i} className="font-mono text-[11px] text-body break-all">{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="panel px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2">
                  <HardwareToggle
                    options={FILTER_OPTIONS}
                    value={filter}
                    onChange={setFilter}
                  />
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={loadApplications}
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
                  >
                    LOAD / REFRESH
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="panel px-4 py-10 text-center">
                    <div className="label-hw text-display mb-2">·NO APPLICATIONS LOADED</div>
                    <p className="label-hw-dim">
                      Click LOAD / REFRESH to fetch applications (signs an admin-action message).
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="panel px-4 py-10 text-center">
                    <div className="label-hw text-display mb-2">·NO MATCHES</div>
                    <p className="label-hw-dim">No applications match the current filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((a) => (
                      <ApplicationCard
                        key={a.id}
                        application={a}
                        programSlug={program.slug}
                        connectedAddress={connectedAddress!}
                        onUpdated={handleUpdated}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default AdminProgramPage;
