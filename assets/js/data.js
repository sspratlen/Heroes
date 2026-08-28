/* ============================================================
   HEROES SENIOR SOFTBALL - Data Layer
   Edit this file to update default data, or use Admin Panel
   ============================================================ */

const HeroesData = {
  // ─── CONFIG ───────────────────────────────────────────────
  config: {
    orgName: "Heroes Senior Softball",
    city: "Omaha",
    state: "NE",
    foundedYear: 2021,
    primaryColor: "#C8102E",
    accentColor: "#F0A500",
    venmoHandle: "@HeroesSoftball",
    storeUrl: "https://nssspiritwear.itemorder.com/shop/category/655293/",
    facebookUrl: "https://www.facebook.com/groups/heroesseniorsoftball",
    contactEmail: "heroesseniorsoftball@gmail.com",
    adminPassword: "heroes2024",
  },

  // ─── TEAMS ────────────────────────────────────────────────
  teams: [
    { id: "55s-aaa",     name: "55\'s AAA",     shortName: "55s",   division: "AAA",         ageGroup: 55, color: "#C8102E", manager: "Mike Marlow",    assistantManager: "James Bennar" },
    { id: "50s-aaa",     name: "50\'s AAA",     shortName: "50s-A", division: "AAA",         ageGroup: 50, color: "#1C6EA4", manager: "Scott Spratlen", assistantManager: "" },
    { id: "50s-aa",      name: "50\'s AA",      shortName: "50s-B", division: "AA",          ageGroup: 50, color: "#16803A", manager: "Doyle Ollis",    assistantManager: "" },
    { id: "majors",      name: "Majors",         shortName: "Maj",   division: "Majors",      ageGroup: null, color: "#C2410C", manager: "",             assistantManager: "" },
    { id: "majors-plus", name: "Majors Plus",    shortName: "Maj+",  division: "Majors Plus", ageGroup: null, color: "#0F766E", manager: "",             assistantManager: "" },
  ],

  // ─── PLAYERS ──────────────────────────────────────────────
  players: [
    // ── 55's AAA ─────────────────────────────────────────────
    { id:"p1",  firstName:"Mike",    lastName:"Marlow",      number:"",   position:"P/OF",  teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"mmarlow",     password:"heroes1"} },
    { id:"p2",  firstName:"James",   lastName:"Bennar",      number:"",   position:"P",     teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"jbennar",     password:"heroes2"} },
    { id:"p3",  firstName:"Clint",   lastName:"Spiegel",     number:"",   position:"P",     teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"cspiegel",    password:"heroes3"} },
    { id:"p4",  firstName:"Dwayne",  lastName:"Hosey",       number:"",   position:"OF",    teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"dhosey",      password:"heroes4"} },
    { id:"p5",  firstName:"Tom",     lastName:"Blazek",      number:"",   position:"OF",    teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"tblazek",     password:"heroes5"} },
    { id:"p6",  firstName:"Jerry",   lastName:"Wegiel",      number:"",   position:"3B",    teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"jwegiel",     password:"heroes6"} },
    { id:"p7",  firstName:"Doug",    lastName:"Collins",     number:"",   position:"OF",    teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"dcollins",    password:"heroes7"} },
    { id:"p8",  firstName:"Doug",    lastName:"Otten",       number:"",   position:"1B",    teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"dotten",      password:"heroes8"} },
    { id:"p9",  firstName:"Dave",    lastName:"Boyer",       number:"",   position:"OF",    teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"dboyer",      password:"heroes9"} },
    { id:"p10", firstName:"AJ",      lastName:"",            number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2021, active:true, photo:"", email:"",                          credentials:{username:"aj",          password:"heroes10"} },
    { id:"p11", firstName:"Roger",   lastName:"Hein",        number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2023, active:true, photo:"", email:"",                          credentials:{username:"rhein",       password:"heroes11"} },
    { id:"p12", firstName:"Jerry",   lastName:"Imig",        number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2022, active:true, photo:"", email:"",                          credentials:{username:"jimig",       password:"heroes12"} },
    { id:"p13", firstName:"Mike",    lastName:"Gaughen",     number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2023, active:true, photo:"", email:"",                          credentials:{username:"mgaughen",    password:"heroes13"} },
    { id:"p14", firstName:"Mike",    lastName:"Shewfelt",    number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"mshewfelt",   password:"heroes14"} },
    { id:"p15", firstName:"Marc",    lastName:"Kurz",        number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2023, active:true, photo:"", email:"",                          credentials:{username:"mkurz",       password:"heroes15"} },
    { id:"p16", firstName:"Jason",   lastName:"Becker",      number:"",   position:"",      teams:["55s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"jbecker",     password:"heroes16"} },
    // ── 50's AAA ─────────────────────────────────────────────
    { id:"p17", firstName:"Scott",   lastName:"Spratlen",    number:"",   position:"SS/2B", teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"scottspratlen@gmail.com",   credentials:{username:"sspratlen",   password:"heroes17"} },
    { id:"p18", firstName:"Brian",   lastName:"Holbrook",    number:"",   position:"DH",    teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"bholbrook",   password:"heroes18"} },
    { id:"p19", firstName:"Chad",    lastName:"Pfortmiller", number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"cpfort",      password:"heroes19"} },
    { id:"p20", firstName:"Scott",   lastName:"Frasier",     number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"sfrasier",    password:"heroes20"} },
    { id:"p21", firstName:"Brad",    lastName:"Bell",        number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"bbell",       password:"heroes21"} },
    { id:"p22", firstName:"Yeti",    lastName:"",            number:"",   position:"OF",    teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"yeti",        password:"heroes22"} },
    { id:"p23", firstName:"JJ",      lastName:"Boedecker",   number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"jboedecker",  password:"heroes23"} },
    { id:"p24", firstName:"Chris",   lastName:"Abeyta",      number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"cabeyta",     password:"heroes24"} },
    { id:"p25", firstName:"Travis",  lastName:"Burbage",     number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"tburbage",    password:"heroes25"} },
    { id:"p26", firstName:"Zach",    lastName:"Weeks",       number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"zweeks",      password:"heroes26"} },
    { id:"p27", firstName:"Joe",     lastName:"Williams",    number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"jwilliams",   password:"heroes27"} },
    { id:"p28", firstName:"Tom",     lastName:"Barkhaus",    number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"tbarkhaus",   password:"heroes28"} },
    { id:"p29", firstName:"Gabby",   lastName:"Duron",       number:"",   position:"C",     teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"gduron",      password:"heroes29"} },
    { id:"p30", firstName:"Todd",    lastName:"B.",          number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"toddb",       password:"heroes30"} },
    { id:"p31", firstName:"Chris",   lastName:"Gee",         number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"cgee",        password:"heroes31"} },
    { id:"p32", firstName:"Scott",   lastName:"Studer",      number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"sstuder",     password:"heroes32"} },
    { id:"p33", firstName:"Seth",    lastName:"Fairman",     number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"sfairman",    password:"heroes33"} },
    { id:"p34", firstName:"Cris",    lastName:"Aguilera",    number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"caguilera",   password:"heroes34"} },
    { id:"p35", firstName:"Will",    lastName:"Williams",    number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"wwilliams",   password:"heroes35"} },
    { id:"p36", firstName:"",        lastName:"Thew",        number:"",   position:"",      teams:["50s-aaa"],           bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"thew",        password:"heroes36"} },
    // ── 50's AA ──────────────────────────────────────────────
    { id:"p37", firstName:"Doyle",   lastName:"Ollis",       number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"dollis",      password:"heroes37"} },
    { id:"p38", firstName:"Stephen", lastName:"Parks",       number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"sparks",      password:"heroes38"} },
    { id:"p39", firstName:"Orlando", lastName:"",            number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"orlando",     password:"heroes39"} },
    { id:"p40", firstName:"Pat",     lastName:"Russell",     number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"prussell",    password:"heroes40"} },
    { id:"p41", firstName:"Jeff",    lastName:"Harper",      number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"jharper",     password:"heroes41"} },
    { id:"p42", firstName:"Steven",  lastName:"Jacobs",      number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"sjacobs",     password:"heroes42"} },
    { id:"p43", firstName:"Mike",    lastName:"McCarthy",    number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"mmccarthy",   password:"heroes43"} },
    { id:"p44", firstName:"Jerome",  lastName:"Ritonya",     number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"jritonya",    password:"heroes44"} },
    { id:"p45", firstName:"Jay",     lastName:"Schubert",    number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"jschubert",   password:"heroes45"} },
    { id:"p46", firstName:"Chris",   lastName:"Dyer",        number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"cdyer",       password:"heroes46"} },
    { id:"p47", firstName:"Scott",   lastName:"Urbach",      number:"",   position:"",      teams:["50s-aa"],            bats:"R", throws:"R", joinYear:2024, active:true, photo:"", email:"",                          credentials:{username:"surbach",     password:"heroes47"} },
  ],

  // ─── GAMES ────────────────────────────────────────────────
  games: [
    // ══ 2025 — 55's AAA — TOC KC Tournament (Apr 18-19) — 4-2 ══
    { id:"g1",  teamId:"55s-aaa", date:"2025-04-18", opponent:"Swagger",                location:"Kansas City, MO", heroScore:24, oppScore:9,  result:"W", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament", playerStats:[] },
    { id:"g2",  teamId:"55s-aaa", date:"2025-04-18", opponent:"Iowa Demons",             location:"Kansas City, MO", heroScore:26, oppScore:20, result:"W", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament", playerStats:[] },
    { id:"g3",  teamId:"55s-aaa", date:"2025-04-18", opponent:"Alliance (CO)",           location:"Kansas City, MO", heroScore:26, oppScore:17, result:"W", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament", playerStats:[] },
    { id:"g4",  teamId:"55s-aaa", date:"2025-04-18", opponent:"Swagger",                location:"Kansas City, MO", heroScore:22, oppScore:17, result:"W", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament", playerStats:[] },
    { id:"g5",  teamId:"55s-aaa", date:"2025-04-19", opponent:"MK Maulers",             location:"Kansas City, MO", heroScore:6,  oppScore:21, result:"L", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament", playerStats:[] },
    { id:"g6",  teamId:"55s-aaa", date:"2025-04-19", opponent:"Iowa Demons",             location:"Kansas City, MO", heroScore:17, oppScore:9,  result:"W", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament", playerStats:[] },
    { id:"g7",  teamId:"55s-aaa", date:"2025-04-19", opponent:"MK Maulers",             location:"Kansas City, MO", heroScore:9,  oppScore:11, result:"L", season:"2025", tournamentId:"e1", notes:"TOC KC Tournament (elim.)", playerStats:[] },
    // ══ 2025 — 55's AAA — Waterloo Tournament (May 17-18) ══
    { id:"g8",  teamId:"55s-aaa", date:"2025-05-17", opponent:"Priority Construction",  location:"Waterloo, IA",    heroScore:23, oppScore:29, result:"L", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament", playerStats:[] },
    { id:"g9",  teamId:"55s-aaa", date:"2025-05-17", opponent:"Isle Edge Trucking",     location:"Waterloo, IA",    heroScore:18, oppScore:17, result:"W", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament", playerStats:[] },
    { id:"g10", teamId:"55s-aaa", date:"2025-05-17", opponent:"Iowa Demons",             location:"Waterloo, IA",    heroScore:21, oppScore:16, result:"W", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament", playerStats:[] },
    { id:"g11", teamId:"55s-aaa", date:"2025-05-17", opponent:"Big Hurt (IL)",           location:"Waterloo, IA",    heroScore:24, oppScore:20, result:"W", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament", playerStats:[] },
    { id:"g12", teamId:"55s-aaa", date:"2025-05-18", opponent:"Iowa Demons",             location:"Waterloo, IA",    heroScore:13, oppScore:17, result:"L", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament", playerStats:[] },
    // ══ 2025 — 50's AAA — Spring World Championship (Apr 18-19) ══
    { id:"g13", teamId:"50s-aaa", date:"2025-04-18", opponent:"Alliance / Scrap Iron 55 (CO)", location:"Kansas City, MO", heroScore:36, oppScore:19, result:"W", season:"2025", tournamentId:"e2", notes:"Spring World Championship", playerStats:[] },
    { id:"g14", teamId:"50s-aaa", date:"2025-04-19", opponent:"Alliance / Scrap Iron 55 (CO)", location:"Kansas City, MO", heroScore:11, oppScore:25, result:"L", season:"2025", tournamentId:"e2", notes:"Spring World Championship", playerStats:[] },
    { id:"g15", teamId:"50s-aaa", date:"2025-04-19", opponent:"Alliance / Scrap Iron 55 (CO)", location:"Kansas City, MO", heroScore:25, oppScore:23, result:"W", season:"2025", tournamentId:"e2", notes:"Spring World Championship (elim. bracket)", playerStats:[] },
    // ══ 2025 — 50's AAA — Waterloo Tournament (May 17-18) ══
    { id:"g16", teamId:"50s-aaa", date:"2025-05-17", opponent:"Heroes AA",               location:"Waterloo, IA",    heroScore:24, oppScore:20, result:"W", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament (vs own AA squad)", playerStats:[] },
    { id:"g17", teamId:"50s-aaa", date:"2025-05-17", opponent:"Heroes AA",               location:"Waterloo, IA",    heroScore:14, oppScore:11, result:"W", season:"2025", tournamentId:"e3", notes:"Waterloo Tournament", playerStats:[] },
    // ══ 2025 — 50's AAA — TOC Northern Championships (Jun 6-7) ══
    { id:"g18", teamId:"50s-aaa", date:"2025-06-06", opponent:"Gray Ghost (IL)",         location:"Northern Region", heroScore:24, oppScore:17, result:"W", season:"2025", tournamentId:"e4", notes:"TOC Northern Championships", playerStats:[] },
    { id:"g19", teamId:"50s-aaa", date:"2025-06-06", opponent:"MN 50 Core",              location:"Northern Region", heroScore:19, oppScore:18, result:"W", season:"2025", tournamentId:"e4", notes:"TOC Northern Championships", playerStats:[] },
    // ══ 2025 — 50's AA — TOC Northern Championships (Jun 6-7) ══
    { id:"g20", teamId:"50s-aa",  date:"2025-06-06", opponent:"Oshkosh Ambassadors (WI)",location:"Northern Region", heroScore:18, oppScore:16, result:"W", season:"2025", tournamentId:"e4", notes:"TOC Northern Championships — qualified for TOC National", playerStats:[] },
    // ══ 2026 — 55's AAA — TOC National, Lakeland FL (Jan 2026) — Runner-Up ══
    { id:"g21", teamId:"55s-aaa", date:"2026-01-14", opponent:"Pro Vision",              location:"Lakeland, FL",    heroScore:22, oppScore:19, result:"W", season:"2026", tournamentId:"e7", notes:"TOC National — Semifinal (triple play game)", playerStats:[] },
    { id:"g22", teamId:"55s-aaa", date:"2026-01-15", opponent:"National Champion",       location:"Lakeland, FL",    heroScore:18, oppScore:21, result:"L", season:"2026", tournamentId:"e7", notes:"TOC National — Championship (Runner-Up)", playerStats:[] },
    // ══ 2026 — 50's AA — TOC National, Lakeland FL (Jan 2026) — Runner-Up ══
    { id:"g23", teamId:"50s-aa",  date:"2026-01-14", opponent:"Top AA Team",             location:"Lakeland, FL",    heroScore:31, oppScore:18, result:"W", season:"2026", tournamentId:"e7", notes:"TOC National — Pool play (.650+ team avg)", playerStats:[] },
    { id:"g24", teamId:"50s-aa",  date:"2026-01-15", opponent:"National Champion",       location:"Lakeland, FL",    heroScore:24, oppScore:27, result:"L", season:"2026", tournamentId:"e7", notes:"TOC National — Championship (Runner-Up)", playerStats:[] },
    // ══ 2026 — 55's AAA — Memorial Weekend Tournament (May 1-3) ══
    { id:"g25", teamId:"55s-aaa", date:"2026-05-01", opponent:"Alliance (CO)",           location:"Omaha, NE",       heroScore:0,  oppScore:0,  result:"T", season:"2026", tournamentId:"e9", notes:"Scores pending entry", playerStats:[] },
    { id:"g26", teamId:"55s-aaa", date:"2026-05-02", opponent:"Johnny\'s Softball",    location:"Omaha, NE",       heroScore:0,  oppScore:0,  result:"T", season:"2026", tournamentId:"e9", notes:"Scores pending entry", playerStats:[] },
    { id:"g27", teamId:"55s-aaa", date:"2026-05-02", opponent:"Alliance (CO)",           location:"Omaha, NE",       heroScore:0,  oppScore:0,  result:"T", season:"2026", tournamentId:"e9", notes:"Scores pending entry", playerStats:[] },
    { id:"g28", teamId:"55s-aaa", date:"2026-05-03", opponent:"Mile High (CO)",          location:"Omaha, NE",       heroScore:0,  oppScore:0,  result:"T", season:"2026", tournamentId:"e9", notes:"Scores pending entry", playerStats:[] },
    { id:"g29", teamId:"55s-aaa", date:"2026-05-03", opponent:"Alliance (CO)",           location:"Omaha, NE",       heroScore:0,  oppScore:0,  result:"T", season:"2026", tournamentId:"e9", notes:"Scores pending entry", playerStats:[] },
  ],

  // ─── EVENTS / TOURNAMENTS ────────────────────────────────
  events: [
    // ── 2025 Season ───────────────────────────────────────────
    {
      id:"e1", type:"tournament", name:"TOC Kansas City Tournament", date:"2025-04-18", endDate:"2025-04-19",
      location:"Kansas City, MO", venue:"Swope Park", address:"6800 Swope Pkwy, Kansas City, MO 64132",
      teams:["55s-aaa"], division:"55+ AAA", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"SSUSA", directorPhone:"",
      notes:"Heroes 55s went 4-2 and earned qualification for the national Tournament of Champions in Lakeland, FL.",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"TOC Qualifier (4-2)",
      availability:[]
    },
    {
      id:"e2", type:"tournament", name:"Spring World Championship", date:"2025-04-18", endDate:"2025-04-19",
      location:"Kansas City, MO", venue:"Swope Park", address:"6800 Swope Pkwy, Kansas City, MO 64132",
      teams:["50s-aaa"], division:"50+ AAA", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"SSUSA", directorPhone:"",
      notes:"Spring World Championship — 50s AAA bracket.",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"",
      availability:[]
    },
    {
      id:"e3", type:"tournament", name:"Waterloo Tournament", date:"2025-05-17", endDate:"2025-05-18",
      location:"Waterloo, IA", venue:"", address:"Waterloo, IA",
      teams:["55s-aaa","50s-aaa"], division:"55+ AAA / 50+ AAA", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"", directorPhone:"",
      notes:"",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"",
      availability:[]
    },
    {
      id:"e4", type:"tournament", name:"TOC Northern Championships", date:"2025-06-06", endDate:"2025-06-07",
      location:"Northern Region", venue:"", address:"",
      teams:["50s-aaa","50s-aa"], division:"50+ AAA / 50+ AA", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"SSUSA", directorPhone:"",
      notes:"50s AA team qualified for the TOC National tournament in Florida.",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"TOC Qualifier",
      availability:[]
    },
    {
      id:"e5", type:"social", name:"Heroes Christmas Party", date:"2025-12-06", endDate:"2025-12-06",
      location:"Omaha, NE", venue:"", address:"",
      teams:["55s-aaa","50s-aaa","50s-aa"], division:"", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"2025-12-01", director:"", directorPhone:"",
      notes:"Annual Heroes Christmas Party with gift exchange, season stats review, and team celebration. Spouses and significant others welcome!",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"",
      availability:[]
    },
    // ── 2026 Season ───────────────────────────────────────────
    {
      id:"e7", type:"tournament", name:"Tournament of Champions — National", date:"2026-01-14", endDate:"2026-01-18",
      location:"Lakeland, FL", venue:"", address:"Lakeland, FL",
      teams:["55s-aaa","50s-aa"], division:"55+ AAA / 50+ AA", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"SSUSA", directorPhone:"",
      notes:"Top national champions compete for the ultimate title. Heroes 55s (led by James Bennar) and 50s AA (led by Doyle Ollis) both finished as runners-up! Highlight: Doug Otten executed a game-saving triple play in the 55s semifinal vs. Pro Vision.",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"Runner-Up — Both Teams",
      availability:[]
    },
    {
      id:"e8", type:"tournament", name:"Midwest Championships", date:"2026-03-01", endDate:"2026-03-02",
      location:"Kansas City, MO", venue:"", address:"Kansas City, MO",
      teams:["55s-aaa","50s-aaa","50s-aa"], division:"All Divisions", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"SSUSA", directorPhone:"",
      notes:"All three Heroes teams competing at the Midwest Championships.",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"closed", status:"completed", placement:"",
      availability:[]
    },
    {
      id:"e9", type:"tournament", name:"2026 Memorial Weekend Tournament", date:"2026-05-01", endDate:"2026-05-03",
      location:"Omaha, NE", venue:"Seymour Smith Park", address:"7300 Seymour Smith Blvd, Omaha NE 68157",
      teams:["55s-aaa"], division:"55+ AAA", entryFee:0,
      rosterDeadline:"", rsvpDeadline:"", director:"", directorPhone:"",
      notes:"In progress — scores pending entry.",
      hotelInfo:"", hotelUrl:"", hotelCode:"",
      registrationStatus:"open", status:"completed", placement:"",
      availability:[]
    },
  ],

  // ─── NEWS / ANNOUNCEMENTS ─────────────────────────────────
  news: [
    {
      id:"n1",
      title:"Two Heroes Teams Finished Runners-Up at the Tournament of Champions",
      category:"Tournament", date:"2026-02-21", season:"2026",
      excerpt:"The Heroes Softball Team made a remarkable impact, with two squads qualifying for the prestigious Tournament of Champions in Lakeland, Florida.",
      content:"The Heroes Softball Team made a remarkable impact in 2025, with two squads qualifying for the prestigious Tournament of Champions in Lakeland, Florida. This exclusive event brings together only the top champions from across the nation to compete for the ultimate title of best team in the country. The Heroes 55\'s, led by James Bennar, and the Heroes 50\'s AA, captained by Doyle Ollis, proudly earned their spots among the elite.\n\nHeld in the heart of central Florida, the tournament featured unforgettable moments. One standout was a brilliant triple play executed by the Heroes 55\'s in a tense semifinal against Pro Vision. With defeat looming, Doug Otten sparked the rally by fielding a sharp grounder at first base, tagging the runner, stepping on the bag, and firing a perfect throw to catcher Gabby at home, where the third-base runner was called out. Heroes triumph!\n\nThe Heroes AA team was unstoppable throughout the weekend, boasting a team batting average over .650. Orlando was especially sensational, finishing the weekend with an incredible .814 average — truly on fire!\n\nBoth teams finished as runners-up in their respective divisions — a fantastic start to the season and a testament to the Heroes\' talent and determination.\n\nNext up is the Midwest Championships in Kansas City, where the entire Heroes organization will proudly field all three teams, once again representing the HEROES WAY!",
      image:"/p/announcements/2383821/848/565/1771693088/fitted.pic",
      author:"Heroes Senior Softball", pinned:true
    },
    {
      id:"n2",
      title:"Heroes Christmas Party — December 6th",
      category:"Announcement", date:"2025-11-25", season:"2025",
      excerpt:"Hey, Heroes Softball family! Our team is so much more than hits and catches — it\'s all about the fun and connections we share!",
      content:"Hey, Heroes Softball family!\n\nOur team is so much more than hits and catches; it\'s all about the fun and connections we share! We love coming together to enjoy each other\'s company, chat about the season, and take a look at our stats. Plus, it\'s a great chance to bring our wives along for some fun away from the diamond!\n\nThis year, we\'re super excited to have the largest group of players and their significant others joining us. Let\'s make it an excellent time and get pumped for the new season together!\n\nDon\'t forget to bring a gift for the gift exchange — everyone loves a surprise!\n\nCan\'t wait to see you all there! Merry Heroes Christmas!",
      image:"/p/announcements/2381361/848/565/1764110361/fitted.pic",
      author:"Heroes Senior Softball", pinned:false
    },
    {
      id:"n3",
      title:"Heroes Charge into KC with a Victory!",
      category:"Tournament", date:"2025-04-21", season:"2025",
      excerpt:"The Heroes 55\'s team traveled to Kansas City and achieved an impressive 4-2 record, earning a coveted berth in the Tournament of Champions.",
      content:"The Heroes 55\'s team traveled to Kansas City and achieved an impressive 4-2 record, earning a coveted berth in the Tournament of Champions next January in Florida.\n\nAll-Tournament Team:\n• James Bennar – MVP: .667 avg, 4 HR, 16 RBI\n• Clint Spiegel: .680 avg, 2 HR, 12 RBI\n• Dwayne Hosey: .692 avg, 3 HR, 14 RBI\n• Tom Blazek: .696 avg, 2 HR, 16 RBI\n• Jerry Wegiel: .696 avg, 12 RBI\n\nCongratulations to the entire HEROES 55 team!",
      image:"/p/announcements/2374127/848/565/1745341537/fitted.pic",
      author:"Heroes Senior Softball", pinned:false
    },
    {
      id:"n4",
      title:"Winning More in 2025",
      category:"Announcement", date:"2024-12-27", season:"2025",
      excerpt:"The nature of senior softball is very competitive. Heroes team strives to win each tournament and always competes above .500.",
      content:"The nature of senior softball is very competitive. It comes down to strategy and a little luck to win tournaments. Let alone have a positive record throughout the season. Heroes team strives to win each tournament, but if those goals fall short, the squad is geared to be above .500 as a record. Always competing.",
      image:"/p/announcements/2369455/848/565/1764887324/fitted.pic",
      author:"Heroes Senior Softball", pinned:false
    },
    {
      id:"n5",
      title:"End of 2024 — Season Awards",
      category:"Announcement", date:"2024-12-26", season:"2024",
      excerpt:"Great year from both Heroes teams. Season awards recognize outstanding performances across the 2024 season.",
      content:"Great year from both Heroes teams — finishing just over .500 we accomplished a ton of experience to build off on.\n\n2024 HEROES AWARDS:\n\nMR. CLUTCH: Dwayne Hosey — .653 avg, 52 GP, 22 HR, 23 2B, 115 RBI, 98 R\n\nMR. PRODUCTION: Chad Pfortmiller — .609 avg, 35 GP, 19 HR, 16 2B, 65 RBI, 58 R\n\nGAME CHANGER: Brad Bell — .704 avg, 32 GP, 7 HR, 13 2B, 59 RBI, 59 R\n\nCHARLIE HUSTLE: Yeti — .575 avg, 25 GP, 3 HR, 15 2B, 59 RBI, 38 R\n\nMOST IMPROVED: AJ — .529 avg, 35 GP, 9 HR, 11 2B, 55 RBI, 37 R\n\nBLACK OPS: Clint Spiegel — .603 avg, 51 GP, 2 HR, 26 2B, 57 RBI, 76 R\n\nEAGLE EYE: Doug Collins — .625 avg, 32 GP, 7 2B, 32 RBI, 38 R\n\nTOP DH (Edgar Martinez): Brian Holbrook — .692 avg, 16 GP, 2 HR, 4 2B, 16 RBI, 36 R\n\nROOKIE OF THE YEAR: Scott Spratlen — .640 avg, 26 GP, 2 HR, 9 2B, 38 RBI, 35 R\n\nPRIME HERO (Best Teammate): Gabby Duron — .542 avg, 26 GP, 4 2B, 20 RBI, 21 R",
      image:"/p/announcements/2369423/848/565/1745325893/fitted.pic",
      author:"Mike Marlow", pinned:false
    },
    {
      id:"n6",
      title:"Expansion Year — 2024",
      category:"Announcement", date:"2024-12-01", season:"2024",
      excerpt:"The Heroes Softball team has made bold strides by expanding to include two teams: a 50s team and a 55s senior softball team.",
      content:"The Heroes Softball team has made bold strides by expanding to include two teams: a 50s team and a 55s senior softball team. This expansion allows more players to compete at the highest levels while building a deeper organizational foundation.",
      image:"/p/announcements/2369422/848/565/1735240652/fitted.pic",
      author:"Mike Marlow", pinned:false
    },
    {
      id:"n7",
      title:"Heroes Tradition",
      category:"Announcement", date:"2024-11-01", season:"2024",
      excerpt:"Heroes Senior Softball team was founded in 2021. Since its inception, the team has grown to over 30 players.",
      content:"Heroes Senior Softball team was founded in 2021; since its inception, the team has grown to over 30 players across multiple competitive divisions. Our commitment to excellence, camaraderie, and competitive softball defines the HEROES WAY.",
      image:"/p/announcements/2368135/848/565/1735240652/fitted.pic",
      author:"Mike Marlow", pinned:false
    },
  ],

  // ─── SPONSORS ─────────────────────────────────────────────
  sponsors: [
    { id:"s1", name:"Heroes Irrigation",          url:"http://www.heroeslawncare.com",        logo:"/p/sponsors/131468/1735252083/large.pic", tier:"gold" },
    { id:"s2", name:"Heroes Lawn Care",           url:"http://www.heroeslawncare.com",        logo:"/p/sponsors/131469/1735252124/large.pic", tier:"gold" },
    { id:"s3", name:"Holes for Heroes Golf Event",url:"https://holesforheroesne.com/",        logo:"/p/sponsors/131472/1751247549/large.pic", tier:"silver" },
    { id:"s4", name:"Ollis Real Estate Group",    url:"https://ollisrealestategroup.com/",    logo:"/p/sponsors/131714/1751247629/large.pic", tier:"silver" },
  ],

  // ─── AWARDS ──────────────────────────────────────────────
  awards: [
    // 2026
    { id:"a1",  year:"2026", title:"TOC National Runner-Up",              team:"55s-aaa", description:"Heroes 55s AAA finished runners-up at the Tournament of Champions in Lakeland, FL", icon:"🥈" },
    { id:"a2",  year:"2026", title:"TOC National Runner-Up",              team:"50s-aa",  description:"Heroes 50s AA finished runners-up at the Tournament of Champions in Lakeland, FL", icon:"🥈" },
    // 2025
    { id:"a3",  year:"2025", title:"TOC Kansas City — Qualified",         team:"55s-aaa", description:"Heroes 55s went 4-2 at TOC KC, earning the national TOC berth", icon:"🏆" },
    { id:"a4",  year:"2025", title:"All-Tournament MVP — James Bennar",   team:"55s-aaa", description:"TOC KC MVP: .667 avg, 4 HR, 16 RBI", icon:"⭐" },
    { id:"a5",  year:"2025", title:"All-Tournament — Tom Blazek",         team:"55s-aaa", description:"TOC KC All-Tournament: .696 avg, 2 HR, 16 RBI", icon:"⭐" },
    { id:"a6",  year:"2025", title:"All-Tournament — Dwayne Hosey",       team:"55s-aaa", description:"TOC KC All-Tournament: .692 avg, 3 HR, 14 RBI", icon:"⭐" },
    { id:"a7",  year:"2025", title:"All-Tournament — Jerry Wegiel",       team:"55s-aaa", description:"TOC KC All-Tournament: .696 avg, 12 RBI", icon:"⭐" },
    { id:"a8",  year:"2025", title:"All-Tournament — Clint Spiegel",      team:"55s-aaa", description:"TOC KC All-Tournament: .680 avg, 2 HR, 12 RBI", icon:"⭐" },
    // 2024
    { id:"a9",  year:"2024", title:"Mr. Clutch — Dwayne Hosey",          team:"55s-aaa", description:".653 avg, 52 GP, 22 HR, 23 2B, 115 RBI, 98 R", icon:"💪" },
    { id:"a10", year:"2024", title:"Mr. Production — Chad Pfortmiller",  team:"50s-aaa", description:".609 avg, 35 GP, 19 HR, 16 2B, 65 RBI, 58 R", icon:"🔥" },
    { id:"a11", year:"2024", title:"Game Changer — Brad Bell",           team:"50s-aaa", description:".704 avg, 32 GP, 7 HR, 13 2B, 59 RBI, 59 R", icon:"⚡" },
    { id:"a12", year:"2024", title:"Charlie Hustle — Yeti",              team:"50s-aaa", description:".575 avg, 25 GP, 3 HR, 15 2B, 59 RBI, 38 R", icon:"🏃" },
    { id:"a13", year:"2024", title:"Most Improved — AJ",                 team:"55s-aaa", description:".529 avg, 35 GP, 9 HR, 11 2B, 55 RBI, 37 R", icon:"📈" },
    { id:"a14", year:"2024", title:"Black Ops — Clint Spiegel",          team:"55s-aaa", description:".603 avg, 51 GP, 2 HR, 26 2B, 57 RBI, 76 R", icon:"🎯" },
    { id:"a15", year:"2024", title:"Eagle Eye — Doug Collins",           team:"55s-aaa", description:".625 avg, 32 GP, 7 2B, 32 RBI, 38 R", icon:"👁" },
    { id:"a16", year:"2024", title:"Top DH (Edgar Martinez) — Brian Holbrook", team:"50s-aaa", description:".692 avg, 16 GP, 2 HR, 4 2B, 16 RBI, 36 R", icon:"🎖" },
    { id:"a17", year:"2024", title:"Rookie of the Year — Scott Spratlen",team:"50s-aaa", description:".640 avg, 26 GP, 2 HR, 9 2B, 38 RBI, 35 R", icon:"🌟" },
    { id:"a18", year:"2024", title:"Prime Hero (Best Teammate) — Gabby Duron", team:"50s-aaa", description:".542 avg, 26 GP, 4 2B, 20 RBI, 21 R", icon:"❤️" },
  ],

  // ─── ACCOUNT REQUESTS ────────────────────────────────────
  accountRequests: [],

  // ─── GALLERY ──────────────────────────────────────────────
  albums: [],
  photos: [],

  // ─── HOME PAGE LAYOUT ─────────────────────────────────────
  pageLayouts: {
    home: [
      { id:"hero",    type:"hero",           visible:true, settings:{} },
      { id:"teams",   type:"team-cards",     visible:true, settings:{ title:"Our Teams", subtitle:"Three competitive teams under one organization" } },
      { id:"record",  type:"latest-results", visible:true, settings:{ title:"Latest Results", count:5 } },
      { id:"leaders", type:"stat-leaders",   visible:true, settings:{ title:"Season Leaders", categories:["avg","hr","rbi"] } },
      { id:"news",    type:"news-feed",      visible:true, settings:{ title:"News & Updates", count:4 } },
      { id:"awards",  type:"awards",         visible:true, settings:{ title:"Achievements", subtitle:"Tournament honors and team accomplishments" } },
      { id:"sponsors",type:"sponsors",       visible:true, settings:{ title:"Our Sponsors", subtitle:"Thank you to our generous supporters" } },
    ]
  }
};

// ─── STAT CALCULATIONS ─────────────────────────────────────
const StatCalc = {
  avg: (h, ab) => ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000',
  obp: (h, bb, hbp, ab, sf) => {
    const denom = ab + bb + hbp + sf;
    return denom > 0 ? ((h + bb + hbp) / denom).toFixed(3).replace(/^0/, '') : '.000';
  },
  slg: (s, d, t, hr, ab) => {
    const tb = s + 2*d + 3*t + 4*hr;
    return ab > 0 ? (tb / ab).toFixed(3).replace(/^0/, '') : '.000';
  },
  ops: (obp, slg) => {
    const o = parseFloat('0' + obp), s = parseFloat('0' + slg);
    return (o + s).toFixed(3).replace(/^0/, '');
  }
};

// ─── COMPUTED: PLAYER SEASON STATS ────────────────────────
function getPlayerStats(playerId, filters = {}) {
  const data = loadData();
  let games = data.games;
  if (filters.season) games = games.filter(g => g.season === filters.season);
  if (filters.teamId) games = games.filter(g => g.teamId === filters.teamId);
  if (filters.dateFrom) games = games.filter(g => g.date >= filters.dateFrom);
  if (filters.dateTo) games = games.filter(g => g.date <= filters.dateTo);
  
  const totals = { g: 0, ab: 0, h: 0, s: 0, d: 0, t: 0, hr: 0, hbp: 0, k: 0, bb: 0, sf: 0, rbi: 0, r: 0 };
  games.forEach(game => {
    const stat = game.playerStats?.find(ps => ps.playerId === playerId);
    if (stat) {
      totals.g++;
      Object.keys(totals).forEach(k => { if (k !== 'g' && stat[k]) totals[k] += stat[k]; });
    }
  });
  return {
    ...totals,
    avg: StatCalc.avg(totals.h, totals.ab),
    obp: StatCalc.obp(totals.h, totals.bb, totals.hbp, totals.ab, totals.sf),
    slg: StatCalc.slg(totals.s, totals.d, totals.t, totals.hr, totals.ab),
    ops: StatCalc.ops(
      StatCalc.obp(totals.h, totals.bb, totals.hbp, totals.ab, totals.sf),
      StatCalc.slg(totals.s, totals.d, totals.t, totals.hr, totals.ab)
    ),
    tb: totals.s + 2*totals.d + 3*totals.t + 4*totals.hr
  };
}

function getTeamRecord(teamId, filters = {}) {
  const data = loadData();
  let games = data.games.filter(g => g.teamId === teamId);
  if (filters.season) games = games.filter(g => (g.season+'') === (filters.season+''));
  const res = g => {
    if (g.heroScore != null && g.oppScore != null && g.heroScore !== '' && g.oppScore !== '') {
      const h = Number(g.heroScore), o = Number(g.oppScore);
      if (h > o) return 'W';
      if (h < o) return 'L';
      return 'T';
    }
    const r = (g.result || '').toLowerCase();
    if (r === 'w' || r === 'win') return 'W';
    if (r === 'l' || r === 'loss') return 'L';
    if (r === 't') return 'T';
    return null;
  };
  const wins = games.filter(g => res(g) === 'W').length;
  const losses = games.filter(g => res(g) === 'L').length;
  const ties = games.filter(g => res(g) === 'T').length;
  return { wins, losses, ties, games: games.length };
}

function getLeaders(stat, limit = 5, filters = {}) {
  const data = loadData();
  const players = data.players.filter(p => p.active);
  const results = players.map(p => ({ player: p, stats: getPlayerStats(p.id, filters) }))
    .filter(x => x.stats.ab >= 5)
    .sort((a, b) => {
      const va = parseFloat('0' + a.stats[stat]) || a.stats[stat] || 0;
      const vb = parseFloat('0' + b.stats[stat]) || b.stats[stat] || 0;
      return vb - va;
    });
  return results.slice(0, limit);
}

function getAvailableSeasons() {
  const data = loadData();
  const yearSet = new Set();
  data.players.forEach(p => {
    if (p.seasonStats) Object.keys(p.seasonStats).forEach(y => yearSet.add(y));
  });
  return [...yearSet].sort().reverse();
}

function getSeasonLeaders(stat, year, teamId, n = 5) {
  const data = loadData();
  let players = data.players.filter(p => p.active);
  if (teamId && teamId !== 'all') players = players.filter(p => (p.teams || []).includes(teamId));
  return players
    .map(p => {
      const s = (year === 'all') ? p.careerStats : (p.seasonStats && p.seasonStats[year]);
      if (!s) return null;
      const val = s[stat];
      if (val == null) return null;
      const numVal = typeof val === 'string' ? parseFloat(val) : Number(val);
      if (isNaN(numVal)) return null;
      return { player: p, stats: s, sortVal: numVal };
    })
    .filter(Boolean)
    .sort((a, b) => b.sortVal - a.sortVal)
    .slice(0, n);
}

// ─── SUPABASE CONFIG ──────────────────────────────────────
// Replace these two values after creating your Supabase project
const SUPABASE_URL     = 'https://mpgbgucmnxowteonldoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qEfH752_O5r7F9pdKTalEA_B8P0LkV0';

// Collections that get synced to Supabase
const DB_COLLECTIONS = ['config','teams','players','games','events','news','awards','sponsors','accountRequests','pageLayouts','albums','photos'];

let _sb = null;
function _getClient() {
  if (_sb) return _sb;
  if (typeof supabase === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL') return null;
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// ─── DATA PERSISTENCE ──────────────────────────────────────

// loadData() stays synchronous — always reads from localStorage cache.
// Supabase data is pre-loaded into the cache by initData() on startup.
function loadData() {
  const saved = localStorage.getItem('heroes_data');
  if (saved) {
    try {
      const d = JSON.parse(saved);
      if (!d.accountRequests) d.accountRequests = [];
      if (!d.tournaments) d.tournaments = [];
      return d;
    } catch(e) {}
  }
  return JSON.parse(JSON.stringify(HeroesData));
}

// saveData: write to localStorage immediately (keeps UI snappy),
// then async-push each changed collection to Supabase in the background.
function saveData(data) {
  localStorage.setItem('heroes_data', JSON.stringify(data));
  _pushToSupabase(data);
}

// saveCollection: update a single named collection without touching others.
// Use this instead of saveData() when only one collection changed — prevents
// stale in-memory snapshots from overwriting other collections in Supabase.
function saveCollection(name, value) {
  const data = loadData();
  data[name] = value;
  localStorage.setItem('heroes_data', JSON.stringify(data));
  _pushCollectionToSupabase(name, value);
}

async function _pushToSupabase(data) {
  const client = _getClient();
  if (!client) return;
  try {
    const rows = DB_COLLECTIONS
      .filter(col => data[col] !== undefined)
      .map(col => ({ collection: col, value: data[col], updated_at: new Date().toISOString() }));
    const { error } = await client.from('heroes_data').upsert(rows, { onConflict: 'collection' });
    if (error) console.warn('Supabase push error:', error.message);
  } catch(e) {
    console.warn('Supabase push failed (offline?):', e.message);
  }
}

async function _pushCollectionToSupabase(name, value) {
  const client = _getClient();
  if (!client) return false;
  try {
    const { error } = await client.from('heroes_data').upsert(
      [{ collection: name, value: value, updated_at: new Date().toISOString() }],
      { onConflict: 'collection' }
    );
    if (error) {
      console.error('Supabase push error:', error.message);
      if (typeof toast === 'function') toast('⚠️ Cloud save failed: ' + error.message + ' — data is local only.', 'error');
      return false;
    }
    return true;
  } catch(e) {
    console.warn('Supabase push failed (offline?):', e.message);
    return false;
  }
}

// initData() — called once on app startup.
// Pulls all collections from Supabase and merges into localStorage cache.
// Falls back to localStorage (or HeroesData defaults) if offline.
async function initData() {
  const client = _getClient();
  if (!client) return; // Supabase not configured yet — use localStorage only

  try {
    const { data: rows, error } = await client
      .from('heroes_data')
      .select('collection, value');

    if (error) { console.warn('Supabase fetch error:', error.message); return; }
    if (!rows || rows.length === 0) {
      // First run — push defaults up to Supabase so other devices get them
      const defaults = JSON.parse(JSON.stringify(HeroesData));
      localStorage.setItem('heroes_data', JSON.stringify(defaults));
      await _pushToSupabase(defaults);
      return;
    }

    // Merge Supabase rows into the local data object
    const base = JSON.parse(JSON.stringify(HeroesData));
    const current = loadData(); // may have unsaved local changes
    const merged = { ...base, ...current };
    rows.forEach(row => { if (row.collection) merged[row.collection] = row.value; });
    if (!merged.accountRequests) merged.accountRequests = [];
    localStorage.setItem('heroes_data', JSON.stringify(merged));
    console.log('✓ Synced from Supabase');
  } catch(e) {
    console.warn('Supabase unavailable, using local cache:', e.message);
  }
}

function resetData() {
  localStorage.removeItem('heroes_data');
  const defaults = JSON.parse(JSON.stringify(HeroesData));
  _pushToSupabase(defaults);
  return defaults;
}

function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `heroes-data-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    saveData(data);
    return true;
  } catch(e) { return false; }
}
