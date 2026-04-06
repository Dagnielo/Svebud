export const REGEL_VERSION = {
  datum: '2026-01-01',
  källa: 'ELNÄT 2025 K §5.9',
  beskrivning: 'Gäller fr.o.m. 1 januari 2026',
}

export function regelÄrGammal(): boolean {
  const sexMån = 6 * 30 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(REGEL_VERSION.datum).getTime() > sexMån
}

// Källreferenser:
// ELNÄT 2025 K punkt 5.9 (gäller fr.o.m. 1 januari 2026)
// https://www.elinstallatoren.se/2026/01/nu-behover-laddbox-och-varmepump-foranmalas-och-godkannas/
// https://elbilsvaruhuset.se/foranmalan-av-laddbox-nya-regler-2026/
// https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan

export const FORANMALAN_JOBBTYPER = [
  {
    id: "laddinfrastruktur",
    label: "Laddinfrastruktur (laddbox/laddstolpar)",
    emoji: "⚡",
    kravs: true,
    typiskHandlaggningstid: "5–15 arbetsdagar",
    notering: "Fast monterad laddbox kräver alltid föranmälan per ELNÄT 2025 K §5.9",
    regelLank: "https://elbilsvaruhuset.se/foranmalan-av-laddbox-nya-regler-2026/",
    stegOchHjälp: {
      fore: "Skicka föranmälan via föranmälan.nu eller nätbolagets egna system. Ange effektbehov (kW) och antal laddplatser.",
      medgivande: "Nätbolaget bedömer nätkapacitet. Kan kräva nätförstärkning om kapacitet saknas.",
      fardig: "Skicka färdiganmälan efter installation. Driftsättning får EJ ske innan godkännande."
    },
    haRedo: {
      fore: ["Installationsadress + fastighetsbeteckning", "Effektbehov per laddbox (kW)", "Antal laddplatser", "Huvudsäkringens storlek (A)", "Elinstallatörens behörighetsnummer"],
      fardig: ["Foto på installationen", "Protokoll med mätarvärden"]
    }
  },
  {
    id: "solceller",
    label: "Solcellsanläggning",
    emoji: "☀️",
    kravs: true,
    typiskHandlaggningstid: "10–30 arbetsdagar",
    notering: "Kräver även ALP-blankett hos vissa nätbolag. Mätarbyte krävs av nätbolaget.",
    regelLank: "https://www.energimyndigheten.se/fornybart/solelportalen/vilka-rattigheter-och-skyldigheter-har-jag-vid-installation/",
    stegOchHjälp: {
      fore: "Skicka föranmälan med systemstorlek (kWp), växelriktarmodell och installationsadress.",
      medgivande: "Nätbolaget kontrollerar att växelriktaren finns på Energiföretagens Rikta Rätt-lista.",
      fardig: "Efter färdiganmälan byter nätbolaget elmätare (räkna med 1–3 veckor extra)."
    },
    haRedo: {
      fore: ["Installationsadress + fastighetsbeteckning", "Systemstorlek (kWp)", "Växelriktare — märke och modell", "Situationsplan / takritning", "Elinstallatörens behörighetsnummer", "ALP-blankett (vissa nätbolag)"],
      fardig: ["Installationsprotokoll", "Foto på växelriktare och paneler"]
    }
  },
  {
    id: "batterilager",
    label: "Batterilager / Energilager",
    emoji: "🔋",
    kravs: true,
    typiskHandlaggningstid: "5–15 arbetsdagar",
    notering: "Kräver att koppling till befintlig solcellsanläggning dokumenteras för att berättiga Grön Teknik-avdrag.",
    regelLank: "https://elbilsvaruhuset.se/foranmalan-av-laddbox-nya-regler-2026/",
    stegOchHjälp: {
      fore: "Ange batterikapacitet (kWh), märkeffekt (kW) och om det kopplas till befintliga solceller.",
      medgivande: "Nätbolaget bekräftar att inmatningssäkringen täcker batteriets maxeffekt.",
      fardig: "Driftsätt aldrig innan godkännande — risk för skador på grannars utrustning."
    },
    haRedo: {
      fore: ["Installationsadress", "Batterikapacitet (kWh)", "Märkeffekt in/ut (kW)", "Koppling till solceller (ja/nej + storlek)", "Elinstallatörens behörighetsnummer"],
      fardig: ["Installationsprotokoll", "Serienummer på batteri"]
    }
  },
  {
    id: "varmepump",
    label: "Värmepump (eldriven)",
    emoji: "🌡️",
    kravs: true,
    typiskHandlaggningstid: "3–10 arbetsdagar",
    notering: "Ny per ELNÄT 2025 K — tidigare krävdes föranmälan bara vid säkringshöjning. Nu alltid.",
    regelLank: "https://www.vvsforum.se/2026/01/vad-innebar-nya-reglerna-om-att-foranmala-varmepumpar/",
    stegOchHjälp: {
      fore: "Ange värmepumpens märkeffekt (kW). Kolla om huvudsäkringen behöver höjas.",
      medgivande: "Många nätbolag godkänner snabbt om säkringen räcker. Kontrollera lokala rutiner.",
      fardig: "Skicka färdiganmälan efter driftsättning."
    },
    haRedo: {
      fore: ["Installationsadress", "Värmepumpens märkeffekt (kW)", "Märke och modell", "Nuvarande huvudsäkring (A)", "Elinstallatörens behörighetsnummer"],
      fardig: ["Installationsprotokoll"]
    }
  },
  {
    id: "spabad_bastu",
    label: "Spabad / Bastu med elaggregat",
    emoji: "🛁",
    kravs: true,
    typiskHandlaggningstid: "3–10 arbetsdagar",
    notering: "Namnges explicit i ELNÄT 2025 K §5.9. Bastuaggregat >3,6 kW räknas som väsentlig förändring.",
    regelLank: "https://kinnekulleenergi.se/huvudsakliga-forandringar-allmanna-avtalsvillkoren-1-jan-2026/",
    stegOchHjälp: {
      fore: "Ange aggregatets effekt (kW). Kontrollera om ny grupp behöver dras.",
      medgivande: "Standardärende om befintlig säkring räcker.",
      fardig: "Skicka färdiganmälan efter installation."
    },
    haRedo: {
      fore: ["Installationsadress", "Aggregatets effekt (kW)", "Nuvarande huvudsäkring (A)", "Elinstallatörens behörighetsnummer"],
      fardig: ["Installationsprotokoll"]
    }
  },
  {
    id: "ny_anslutning",
    label: "Ny elanslutning / Nybyggnation",
    emoji: "🏗️",
    kravs: true,
    typiskHandlaggningstid: "20–90 arbetsdagar",
    notering: "Kontakta nätbolaget MINST 6 månader i förväg om kabelgrävning eller nätförstärkning kan krävas.",
    regelLank: "https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan",
    stegOchHjälp: {
      fore: "Skicka in tidigt — nätbolaget kan behöva planera kabelgrävning och nätförstärkning.",
      medgivande: "Installationsmedgivande anger anslutningspunkt och tekniska krav.",
      fardig: "Nätbolaget monterar mätare vid färdiganmälan."
    },
    haRedo: {
      fore: ["Fastighetsbeteckning + situationsplan", "Önskad säkringsstorlek (A)", "Beräknad effektförbrukning (kW)", "Bygglov / startbesked", "Önskad inkopplingsdatum", "Elinstallatörens behörighetsnummer"],
      fardig: ["Installationsprotokoll", "Slutbesiktningsprotokoll"]
    }
  },
  {
    id: "sakringshojning",
    label: "Höjning av huvudsäkring",
    emoji: "🔌",
    kravs: true,
    typiskHandlaggningstid: "3–10 arbetsdagar",
    notering: "Vanligt vid BRF-renoveringar och laddinfrastrukturprojekt. Påverkar nätavgiften.",
    regelLank: "https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan",
    stegOchHjälp: {
      fore: "Ange nuvarande säkring (A) och önskad säkring (A).",
      medgivande: "Nätbolaget kontrollerar om ledning och transformator klarar ökad belastning.",
      fardig: "Nätbolaget uppdaterar nätavgiften baserat på ny säkringsstorlek."
    },
    haRedo: {
      fore: ["Installationsadress + fastighetsbeteckning", "Nuvarande säkring (A)", "Önskad säkring (A)", "Motivering (t.ex. laddbox, värmepump)", "Elinstallatörens behörighetsnummer"],
      fardig: ["Protokoll efter inkoppling"]
    }
  },
  {
    id: "stamrenovering",
    label: "Stamrenovering / Ny elcentral",
    emoji: "🏢",
    kravs: true,
    typiskHandlaggningstid: "10–20 arbetsdagar",
    notering: "BRF-anbud — omfattas av föranmälan om säkring ändras eller matarledning berörs.",
    regelLank: "https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan",
    stegOchHjälp: {
      fore: "Ange antal lägenheter, nuvarande och planerad säkring per lägenhet.",
      medgivande: "Nätbolaget bedömer om matarledningen räcker för ny last.",
      fardig: "Etappvis driftsättning — skicka färdiganmälan per etapp om nätbolaget kräver det."
    },
    haRedo: {
      fore: ["Antal lägenheter / elcentraler som berörs", "Nuvarande och planerad säkring per lägenhet (A)", "Matarledningens dimension", "Fastighetsbeteckning", "Elinstallatörens behörighetsnummer"],
      fardig: ["Installationsprotokoll per etapp", "Mätarförteckning"]
    }
  },
  {
    id: "service_underhall",
    label: "Service / Underhåll / Byte av uttag",
    emoji: "🔧",
    kravs: false,
    typiskHandlaggningstid: null,
    notering: "Kräver INTE föranmälan. Färdiganmälan kan krävas om arbetet påverkar mätarsystemet.",
    regelLank: null,
    stegOchHjälp: null
  }
] as const

export type JobbTypId = typeof FORANMALAN_JOBBTYPER[number]["id"]

export const FORANMALAN_STEG = [
  { id: "vunnet",    label: "Anbud vunnet",              emoji: "🏆", färg: "#F5C400" },
  { id: "fore",      label: "Föranmälan inskickad",      emoji: "📋", färg: "#4A9EFF" },
  { id: "medgivande",label: "Installationsmedgivande",   emoji: "✅", färg: "#4A9EFF" },
  { id: "installation", label: "Installation pågår",     emoji: "🔧", färg: "#4A9EFF" },
  { id: "fardig",    label: "Färdiganmälan inskickad",   emoji: "📨", färg: "#4A9EFF" },
  { id: "klar",      label: "Nätbolag godkänt — Klar",   emoji: "⚡", färg: "#00C67A" },
] as const

export type StegId = typeof FORANMALAN_STEG[number]["id"]

export const STEG_ORDNING: StegId[] = [
  "vunnet", "fore", "medgivande", "installation", "fardig", "klar"
]

export function nästaSteg(nuvarande: StegId): StegId | null {
  const idx = STEG_ORDNING.indexOf(nuvarande)
  if (idx === -1 || idx === STEG_ORDNING.length - 1) return null
  return STEG_ORDNING[idx + 1]
}

export function stegIndex(steg: StegId): number {
  return STEG_ORDNING.indexOf(steg)
}
