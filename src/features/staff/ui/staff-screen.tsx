import { Leaderboard } from "./leaderboard";
import { Podium } from "./podium";
import { StaffDrawer } from "./staff-drawer";
import { StaffHero } from "./staff-hero";
import { TeamsStrip } from "./teams-strip";

/**
 * «Xodimlar reytingi»: tahririy sarlavha va rol almashtirgich, eng yaxshi uchlik shohsupasi,
 * jamoalar plitkalari (filtr) va to'liq reyting jadvali; qator — xodim profili.
 */
export const StaffScreen = () => (
  <>
    <StaffHero />
    <Podium />
    <TeamsStrip />
    <Leaderboard />
    <StaffDrawer />
  </>
);
