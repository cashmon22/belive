import {
  CheckCircle2,
  Smartphone,
  Camera,
  Send,
  FileCheck2,
  Wallet,
  MessageSquare,
  Info,
  Mail,
} from "lucide-react";

type ApprovedDeviceInstructionsProps = {
  deviceName: string;
};

const depositSteps = [
  {
    icon: Smartphone,
    title: "Open your bank's official mobile banking app",
    description:
      "Open the official mobile banking application provided by your bank.",
  },
  {
    icon: FileCheck2,
    title: "Select Mobile Check Deposit",
    description:
      "Choose Mobile Check Deposit, Deposit a Check, or the equivalent option provided by your bank.",
  },
  {
    icon: Camera,
    title: "Enter the check information",
    description:
      "Follow your bank's instructions to enter the check amount and photograph the front and back of the check.",
  },
  {
    icon: Send,
    title: "Submit the deposit",
    description:
      "Review the information carefully and submit the deposit through your bank's mobile banking app.",
  },
  {
    icon: Wallet,
    title: "Keep the original check",
    description:
      "Keep the original check in a secure place until your bank confirms that the deposit has been accepted and the funds are fully available.",
  },
  {
    icon: MessageSquare,
    title: "Proceed once funds are available",
    description:
      "Once your bank has verified the deposit and the funds are available, you may proceed with payment for your approved device by contacting the seller.",
  },
];

export default function ApprovedDeviceInstructions({
  deviceName,
}: ApprovedDeviceInstructionsProps) {
  const contactSellerUrl = `https://t.me/AuthorizedDeviceDesk?text=${encodeURIComponent(
    `Hello, my device request for the ${deviceName} has been approved. I'd like to proceed with payment for this device. Please let me know the next steps. Thank you.`,
  )}`;

  return (
    <div className="mt-5 space-y-5">
      {/* Approval header */}
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
          <CheckCircle2 size={21} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-navy">{deviceName}</p>
          <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
            Approved
          </span>
        </div>
      </div>

      {/* Approval confirmation card */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <p className="text-sm font-extrabold text-emerald-700">
            Your Device Request Has Been Approved
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">
          Your device request has been approved.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          A check will be sent to the email address associated with your account
          within <strong className="text-navy">48 hours</strong>.
        </p>
      </div>

      {/* Mobile check deposit instructions */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-[#fbfcfd] px-5 py-4">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-orange" />
            <h3 className="text-sm font-extrabold text-navy">
              Mobile Check Deposit Instructions
            </h3>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Once you receive the check, please follow these steps:
          </p>
        </div>

        <ol className="divide-y divide-slate-100">
          {depositSteps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li key={index} className="flex gap-4 px-5 py-4">
                <div className="flex shrink-0 flex-col items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/10 text-xs font-extrabold text-orange">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StepIcon size={14} className="shrink-0 text-slate-400" />
                    <h4 className="text-xs font-extrabold text-navy">
                      {step.title}
                    </h4>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Important notice */}
      <div className="flex items-start gap-3 rounded-lg border border-orange/25 bg-orange/[0.06] p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-orange" />
        <div>
          <p className="text-xs font-extrabold text-navy">Important</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-600">
            Do not proceed with payment until your bank has verified the deposit
            and the funds are fully available. Always use your bank's official
            mobile banking application for check deposits.
          </p>
        </div>
      </div>

      <a
        href={contactSellerUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange px-5 py-3.5 text-sm font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.16)] transition hover:-translate-y-0.5 hover:bg-orange-light"
      >
        <Mail size={16} />
        Contact Seller
      </a>
    </div>
  );
}
