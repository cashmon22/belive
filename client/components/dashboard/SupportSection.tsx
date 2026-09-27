import { Link } from "react-router-dom";
import {
  ArrowRight,
  Headphones,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
} from "lucide-react";

const supportItems = [
  {
    icon: HelpCircle,
    title: "Help Center",
    description: "Browse frequently asked questions and contributor guides.",
    link: "/faq",
    linkText: "Visit FAQ",
  },
  {
    icon: Mail,
    title: "Contact Support",
    description: "Get in touch with our support team for assistance.",
    link: "/contact",
    linkText: "Contact us",
  },
  {
    icon: MessageSquare,
    title: "Trusted Vendor",
    description: "Contact a trusted vendor for device authorization support.",
    link: "/trusted-vendor",
    linkText: "Contact vendor",
  },
];

export default function SupportSection() {
  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          Contributor workspace
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">
          Support
        </h1>
        <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">
          Need help? We're here to support you with any questions or issues.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {supportItems.map((item) => (
          <div
            key={item.title}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-orange/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange/10 text-orange">
              <item.icon size={22} />
            </span>
            <h3 className="mt-4 text-sm font-extrabold text-navy">
              {item.title}
            </h3>
            <p className="mt-2 flex-1 text-xs leading-5 text-slate-500">
              {item.description}
            </p>
            <Link
              to={item.link}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange transition hover:text-orange-light"
            >
              {item.linkText} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-navy p-5 text-white shadow-card sm:p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange text-navy">
            <LifeBuoy size={17} />
          </span>
          <h2 className="text-sm font-extrabold">Need more help?</h2>
        </div>
        <p className="mt-4 text-xs leading-5 text-white/70">
          Our support team is available to assist you with account issues,
          device authorization, and assignment questions.
        </p>
        <Link
          to="/contact"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange px-4 py-3 text-xs font-extrabold text-navy transition hover:bg-orange-light"
        >
          <Headphones size={15} /> Contact Support Team
        </Link>
      </div>
    </div>
  );
}
