import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import {
  api,
  type ApiProgram,
  type ApiProgramApplication,
  ApiError,
} from "@/lib/api";
import { isAdmin as checkIsAdmin } from "@/lib/constants";
import { ApplicationCard } from "@/components/admin/ApplicationCard";
import { useToast } from "@/hooks/use-toast";

const FILTERS: Array<{ value: ApiProgramApplication["status"] | "all"; label: string }> = [
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "all", label: "All" },
];

const AdminProgramPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [applications, setApplications] = useState<ApiProgramApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [filter, setFilter] = useState<ApiProgramApplication["status"] | "all">("submitted");

  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isAdminWallet, setIsAdminWallet] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Try to restore session address if admin
    try {
      const raw = sessionStorage.getItem("admin_session_account");
      if (raw) {
        const acc = JSON.parse(raw);
        if (checkIsAdmin(acc.address)) {
          setConnectedAddress(acc.address);
          setIsAdminWallet(true);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .getProgramBySlug(slug)
      .then((r) => {
        if (active) setProgram(r.data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const loadApplications = async () => {
    if (!slug || !isAdminWallet || !connectedAddress) return;
    try {
      // Build the SIWS auth header; listProgramApplications is admin-gated.
      await web3Enable("Stadium");
      const accounts = await web3Accounts();
      const account = accounts.find((a) => a.address === connectedAddress) || accounts[0];
      if (!account) return;
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({ action: "admin-action" }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = (await siws.sign(injector)) as unknown as { signature: string; message?: string };
      const messageStr =
        typeof signed.message === "string" && signed.message
          ? signed.message
          : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(
        JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }),
      );
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
    setConnecting(true);
    try {
      await web3Enable("Stadium");
      const accounts = await web3Accounts();
      const admin = accounts.find((a) => checkIsAdmin(a.address));
      if (!admin) {
        toast({
          title: "Admin account not found in wallet",
          description: "Connect a wallet whose address is in ADMIN_WALLETS.",
          variant: "destructive",
        });
        return;
      }
      setConnectedAddress(admin.address);
      setIsAdminWallet(true);
      sessionStorage.setItem(
        "admin_session_account",
        JSON.stringify({ address: admin.address, meta: admin.meta }),
      );
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't connect wallet",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const filtered =
    filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const handleUpdated = (next: ApiProgramApplication) => {
    setApplications((prev) => prev.map((a) => (a.id === next.id ? next : a)));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to admin
          </Link>
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-16">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading program…
          </div>
        ) : notFound ? (
          <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center">
            <h1 className="font-heading text-2xl font-bold">Program not found</h1>
            <Button asChild className="mt-4">
              <Link to="/admin">Back to admin</Link>
            </Button>
          </div>
        ) : program ? (
          <>
            <header className="mb-6">
              <p className="text-sm text-muted-foreground">{program.programType}</p>
              <h1 className="mt-1 font-heading text-3xl font-bold md:text-4xl">{program.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={program.status === "open" ? "default" : "secondary"}>
                  {program.status}
                </Badge>
                {program.location && (
                  <span className="text-sm text-muted-foreground">{program.location}</span>
                )}
              </div>
            </header>

            {!isAdminWallet ? (
              <div className="rounded-lg border bg-card p-6 text-center">
                <p className="text-sm">
                  Admin wallet required to review applications.
                </p>
                <Button onClick={connectWallet} disabled={connecting} className="mt-3 gap-2">
                  {connecting ? "Connecting…" : "Connect admin wallet"}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1">
                    {FILTERS.map((f) => (
                      <Button
                        key={f.value}
                        variant={filter === f.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(f.value)}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" onClick={loadApplications}>
                    Load / refresh
                  </Button>
                </div>

                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">
                    Click <em>Load / refresh</em> to fetch applications (SIWS-signed admin fetch).
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">
                    No applications match the current filter.
                  </p>
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
