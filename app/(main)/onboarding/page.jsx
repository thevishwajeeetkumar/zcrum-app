"use client";

import { OrganizationList } from "@clerk/nextjs";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

export default function Onboarding() {
  // const { organization } = useOrganization();
  // const router = useRouter();

  // useEffect(() => {
  //   if (organization) {
  //     router.push(`/organization/${organization.slug}`);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [organization]);

  return (
    <div className="flex justify-center items-center pt-14">
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl={(org) => `/organization/${org.id}`}
        afterSelectOrganizationUrl={(org) => `/organization/${org.id}`}
      />
    </div>
  );
}
