import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { AdminTierSection } from "@/components/admin/AdminTierSection";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/**
 * Tier-0 admin console. Only app_admins can see / use this. The page first
 * probes `/admin/me/tier`; if the connected wallet isn't an app_admin, it
 * redirects back to /admin with a toast.
 */
const AppAdminsPage = () => {
  const auth = useWalletAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tierStatus, setTierStatus] = useState<"checking" | "ok" | "denied" | "unauthenticated">(
    "checking",
  );

  const { getAdminBearerHeaders, account } = auth;
  const getAuth = useCallback(() => getAdminBearerHeaders(), [getAdminBearerHeaders]);

  // Tier probe — gates the rest of the page.
  useEffect(() => {
    let cancelled = false;
    if (!account) {
      setTierStatus("unauthenticated");
      return;
    }
    (async () => {
      try {
        const auth = await getAuth();
        const res = await api.getMyAdminTier(auth);
        if (cancelled) return;
        if (res.data.isAppAdmin) {
          setTierStatus("ok");
        } else {
          setTierStatus("denied");
          toast({
            title: "Not authorized",
            description: "Only app admins can manage the admin tiers.",
            variant: "destructive",
          });
          setTimeout(() => navigate("/admin"), 1200);
        }
      } catch (e) {
        if (cancelled) return;
        setTierStatus("denied");
        toast({
          title: "Couldn't check admin tier",
          description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
          variant: "destructive",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, getAuth, navigate, toast]);

  const connectWallet = async () => {
    try {
      const found = await auth.connect();
      if (found[0]) auth.selectAccount(found[0]);
    } catch (e) {
      toast({
        title: "Couldn't connect wallet",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen scanlines">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6">
          <Link
            to="/admin"
            className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
          >
            ◂ BACK TO ADMIN
          </Link>
        </div>

        <header className="mb-6">
          <div className="label-hw-dim mb-2">·ADMIN / APP ADMINS</div>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight text-display leading-[0.95] mb-3">
            Admin Tiers
          </h1>
          <p className="text-body text-sm max-w-2xl">
            Tier 0 (App Admins) manage who is in either tier. Tier 1 (Global Admins) can administer
            every program in Stadium. Tier 2 (Program Admins) are scoped to a single program and
            managed from each program's admin page.
          </p>
        </header>

        {tierStatus === "unauthenticated" && (
          <section className="panel p-6 text-center">
            <div className="label-hw text-display mb-3">·CONNECT YOUR WALLET</div>
            <p className="text-body text-sm mb-4">
              Only app admins can view this page. Connect to verify.
            </p>
            <button
              type="button"
              onClick={connectWallet}
              disabled={auth.isConnecting}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
            >
              {auth.isConnecting ? "CONNECTING…" : "CONNECT WALLET"}
            </button>
          </section>
        )}

        {tierStatus === "checking" && (
          <p className="label-hw-dim">CHECKING TIER…</p>
        )}

        {tierStatus === "denied" && (
          <section className="panel p-6 text-center">
            <div className="label-hw text-destructive mb-2">·NOT AN APP ADMIN</div>
            <p className="text-body text-sm">Redirecting…</p>
          </section>
        )}

        {tierStatus === "ok" && (
          <>
            <AdminTierSection
              title="App Admins"
              description="Tier 0 — manage admin lists themselves. Cannot remove the last one."
              emptyHint="No app admins. This should be impossible — bootstrap script must have run."
              load={(a) => api.listAppAdmins(a)}
              add={(p, a) => api.addAppAdmin(p, a)}
              remove={(w, c, a) => api.removeAppAdmin(w, c, a)}
              signAuthHeader={getAuth}
            />
            <AdminTierSection
              title="Global Admins"
              description="Tier 1 — administer every program. Initial entries seeded from AUTHORIZED_SIGNERS env at bootstrap."
              emptyHint="No global admins yet. Add wallets that should administer every program."
              load={(a) => api.listGlobalAdmins(a)}
              add={(p, a) => api.addGlobalAdmin(p, a)}
              remove={(w, c, a) => api.removeGlobalAdmin(w, c, a)}
              signAuthHeader={getAuth}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default AppAdminsPage;
