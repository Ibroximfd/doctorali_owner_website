"use client";

import { useStaffView } from "../hooks/use-staff";
import { Leaderboard } from "./leaderboard";
import { LogistsRatingsLink } from "./logists-ratings-link";
import { Podium } from "./podium";
import { StaffDrawer } from "./staff-drawer";
import { StaffHero } from "./staff-hero";
import { TeamsStrip } from "./teams-strip";

/**
 * «Xodimlar reytingi»: tahririy sarlavha va rol almashtirgich, eng yaxshi uchlik shohsupasi,
 * jamoalar plitkalari (filtr) va to'liq reyting jadvali; qator — xodim profili. Logistlar natijasi —
 * «Reytinglar» bo'limida (`ratings/logists/`), bu yerda unga havola.
 */
export const StaffScreen = () => {
  const { role } = useStaffView();
  return (
    <>
      <StaffHero />
      {role === "logist" ? (
        <LogistsRatingsLink />
      ) : (
        <>
          <Podium />
          <TeamsStrip />
          <Leaderboard />
          <StaffDrawer />
        </>
      )}
    </>
  );
};
