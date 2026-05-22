import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen scanlines flex items-center justify-center px-4">
      <div className="panel p-10 max-w-md w-full text-center">
        <div className="label-hw-dim mb-3">·SIGNAL LOST</div>
        <h1 className="font-display text-7xl uppercase tracking-tight text-display leading-none mb-4">
          404
        </h1>
        <p className="text-body text-base mb-2">No entry found at this address.</p>
        <p className="label-hw-dim mb-6 break-all">{location.pathname}</p>
        <Link
          to="/"
          className="inline-block font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
        >
          ◂ BACK TO DIRECTORY
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
