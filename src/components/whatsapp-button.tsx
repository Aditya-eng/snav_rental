import { MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/utils";

export async function WhatsAppButton() {
  const s = await getSettings();
  const number = s.whatsapp || s.phone;
  if (!number) return null;
  return (
    <a
      href={whatsappLink(number, "Hi SNAV, I'd like to enquire about renting DGPS equipment.")}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-95"
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle className="size-5" aria-hidden />
      <span className="hidden sm:inline">WhatsApp us</span>
    </a>
  );
}
