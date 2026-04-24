import { ContactDetailPage } from "@/components/screens/contact-detail";

export default function Page({ params }: { params: { contactId: string } }) {
  return <ContactDetailPage contactId={params.contactId} />;
}
