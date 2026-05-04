import { db } from "@workspace/db";
import {
  locationStates,
  locationDistricts,
  locationTaluks,
  locationHoblis,
  locationVillages,
  farmers,
  udlrnMaster,
  adminOfficers,
  cscOperators,
  claims,
  cropPhenologyCalendar,
  insurerAccounts,
  notifications,
  fraudHeatmapDaily,
} from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`bhuvigyan:${password}`).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // States
  await db.insert(locationStates).values([
    { code: "29", name: "Karnataka", landSystem: "BHOOMI", landApiBaseUrl: "https://landrecords.karnataka.gov.in", apiType: "REST" },
    { code: "27", name: "Maharashtra", landSystem: "MAHABHUMI", landApiBaseUrl: "https://abhilekh.mahabhumi.gov.in", apiType: "REST" },
    { code: "36", name: "Telangana", landSystem: "DHARANI", landApiBaseUrl: "https://dharani.telangana.gov.in", apiType: "REST" },
    { code: "03", name: "Punjab", landSystem: "JAMABANDI", landApiBaseUrl: "https://jamabandi.punjab.gov.in", apiType: "REST" },
    { code: "09", name: "Uttar Pradesh", landSystem: "BHULEKH", landApiBaseUrl: "https://upbhulekh.gov.in", apiType: "REST" },
    { code: "08", name: "Rajasthan", landSystem: "APNA_KHATA", landApiBaseUrl: "https://apnakhata.rajasthan.gov.in", apiType: "REST" },
  ]).onConflictDoNothing();

  // Karnataka Districts (key ones)
  const karnaDistricts = [
    { id: "29-0572", stateCode: "29", name: "Bagalkot", kgisDistrictCode: "0572", censusCode: "572", lat: "16.1691", lng: "75.6963" },
    { id: "29-0573", stateCode: "29", name: "Bangalore Rural", kgisDistrictCode: "0573", censusCode: "573", lat: "13.2257", lng: "77.5728" },
    { id: "29-0574", stateCode: "29", name: "Bangalore Urban", kgisDistrictCode: "0574", censusCode: "574", lat: "12.9716", lng: "77.5946" },
    { id: "29-0575", stateCode: "29", name: "Belagavi", kgisDistrictCode: "0575", censusCode: "575", lat: "15.8497", lng: "74.4977" },
    { id: "29-0576", stateCode: "29", name: "Bellary", kgisDistrictCode: "0576", censusCode: "576", lat: "15.1394", lng: "76.9214" },
    { id: "29-0577", stateCode: "29", name: "Bidar", kgisDistrictCode: "0577", censusCode: "577", lat: "17.9104", lng: "77.5199" },
    { id: "29-0578", stateCode: "29", name: "Vijayapura", kgisDistrictCode: "0578", censusCode: "578", lat: "16.8302", lng: "75.7100" },
    { id: "29-0579", stateCode: "29", name: "Chamarajanagar", kgisDistrictCode: "0579", censusCode: "579", lat: "11.9269", lng: "76.9441" },
    { id: "29-0580", stateCode: "29", name: "Chikkaballapur", kgisDistrictCode: "0580", censusCode: "580", lat: "13.4355", lng: "77.7280" },
    { id: "29-0581", stateCode: "29", name: "Chikkamagaluru", kgisDistrictCode: "0581", censusCode: "581", lat: "13.3153", lng: "75.7754" },
    { id: "29-0582", stateCode: "29", name: "Chitradurga", kgisDistrictCode: "0582", censusCode: "582", lat: "14.2251", lng: "76.4009" },
    { id: "29-0583", stateCode: "29", name: "Dakshina Kannada", kgisDistrictCode: "0583", censusCode: "583", lat: "12.8438", lng: "75.2479" },
    { id: "29-0584", stateCode: "29", name: "Davanagere", kgisDistrictCode: "0584", censusCode: "584", lat: "14.4644", lng: "75.9217" },
    { id: "29-0585", stateCode: "29", name: "Dharwad", kgisDistrictCode: "0585", censusCode: "585", lat: "15.4589", lng: "75.0078" },
    { id: "29-0586", stateCode: "29", name: "Gadag", kgisDistrictCode: "0586", censusCode: "586", lat: "15.4316", lng: "75.6208" },
    { id: "29-0587", stateCode: "29", name: "Gulbarga", kgisDistrictCode: "0587", censusCode: "587", lat: "17.3297", lng: "76.8343" },
    { id: "29-0588", stateCode: "29", name: "Hassan", kgisDistrictCode: "0588", censusCode: "588", lat: "13.0068", lng: "76.1004" },
    { id: "29-0589", stateCode: "29", name: "Haveri", kgisDistrictCode: "0589", censusCode: "589", lat: "14.7939", lng: "75.3996" },
    { id: "29-0590", stateCode: "29", name: "Kodagu", kgisDistrictCode: "0590", censusCode: "590", lat: "12.4244", lng: "75.7382" },
    { id: "29-0591", stateCode: "29", name: "Kolar", kgisDistrictCode: "0591", censusCode: "591", lat: "13.1357", lng: "78.1293" },
    { id: "29-0592", stateCode: "29", name: "Koppal", kgisDistrictCode: "0592", censusCode: "592", lat: "15.3479", lng: "76.1547" },
    { id: "29-0593", stateCode: "29", name: "Mandya", kgisDistrictCode: "0593", censusCode: "593", lat: "12.5218", lng: "76.8951" },
    { id: "29-0594", stateCode: "29", name: "Mysuru", kgisDistrictCode: "0594", censusCode: "594", lat: "12.2958", lng: "76.6394" },
    { id: "29-0595", stateCode: "29", name: "Raichur", kgisDistrictCode: "0595", censusCode: "595", lat: "16.2120", lng: "77.3439" },
    { id: "29-0596", stateCode: "29", name: "Ramanagara", kgisDistrictCode: "0596", censusCode: "596", lat: "12.7157", lng: "77.2820" },
    { id: "29-0597", stateCode: "29", name: "Shimoga", kgisDistrictCode: "0597", censusCode: "597", lat: "13.9299", lng: "75.5681" },
    { id: "29-0598", stateCode: "29", name: "Tumkur", kgisDistrictCode: "0598", censusCode: "598", lat: "13.3379", lng: "77.1173" },
    { id: "29-0599", stateCode: "29", name: "Udupi", kgisDistrictCode: "0599", censusCode: "599", lat: "13.3409", lng: "74.7421" },
    { id: "29-0600", stateCode: "29", name: "Uttara Kannada", kgisDistrictCode: "0600", censusCode: "600", lat: "14.7757", lng: "74.7786" },
    { id: "29-0601", stateCode: "29", name: "Yadgir", kgisDistrictCode: "0601", censusCode: "601", lat: "16.7669", lng: "77.1379" },
  ];
  await db.insert(locationDistricts).values(karnaDistricts).onConflictDoNothing();

  // Maharashtra Districts (key ones)
  const maharashtraDistricts = [
    { id: "27-0001", stateCode: "27", name: "Ahmednagar", censusCode: "001", lat: "19.0952", lng: "74.7380" },
    { id: "27-0002", stateCode: "27", name: "Akola", censusCode: "002", lat: "20.7002", lng: "77.0082" },
    { id: "27-0003", stateCode: "27", name: "Amravati", censusCode: "003", lat: "20.9374", lng: "77.7796" },
    { id: "27-0004", stateCode: "27", name: "Aurangabad", censusCode: "004", lat: "19.8762", lng: "75.3433" },
    { id: "27-0005", stateCode: "27", name: "Beed", censusCode: "005", lat: "18.9890", lng: "75.7596" },
    { id: "27-0006", stateCode: "27", name: "Bhandara", censusCode: "006", lat: "21.1666", lng: "79.6500" },
    { id: "27-0007", stateCode: "27", name: "Buldhana", censusCode: "007", lat: "20.5292", lng: "76.1842" },
    { id: "27-0008", stateCode: "27", name: "Chandrapur", censusCode: "008", lat: "19.9615", lng: "79.2961" },
    { id: "27-0009", stateCode: "27", name: "Dhule", censusCode: "009", lat: "20.9042", lng: "74.7749" },
    { id: "27-0010", stateCode: "27", name: "Gadchiroli", censusCode: "010", lat: "20.1809", lng: "80.0000" },
    { id: "27-0011", stateCode: "27", name: "Jalgaon", censusCode: "011", lat: "21.0077", lng: "75.5626" },
    { id: "27-0012", stateCode: "27", name: "Jalna", censusCode: "012", lat: "19.8347", lng: "75.8816" },
    { id: "27-0013", stateCode: "27", name: "Kolhapur", censusCode: "013", lat: "16.7050", lng: "74.2433" },
    { id: "27-0014", stateCode: "27", name: "Latur", censusCode: "014", lat: "18.4088", lng: "76.5604" },
    { id: "27-0015", stateCode: "27", name: "Mumbai", censusCode: "015", lat: "19.0760", lng: "72.8777" },
    { id: "27-0016", stateCode: "27", name: "Nagpur", censusCode: "016", lat: "21.1458", lng: "79.0882" },
    { id: "27-0017", stateCode: "27", name: "Nanded", censusCode: "017", lat: "19.1383", lng: "77.3210" },
    { id: "27-0018", stateCode: "27", name: "Nashik", censusCode: "018", lat: "19.9975", lng: "73.7898" },
    { id: "27-0019", stateCode: "27", name: "Osmanabad", censusCode: "019", lat: "18.1860", lng: "76.0350" },
    { id: "27-0020", stateCode: "27", name: "Pune", censusCode: "020", lat: "18.5204", lng: "73.8567" },
    { id: "27-0021", stateCode: "27", name: "Raigad", censusCode: "021", lat: "18.5158", lng: "73.1827" },
    { id: "27-0022", stateCode: "27", name: "Sangli", censusCode: "022", lat: "16.8524", lng: "74.5815" },
    { id: "27-0023", stateCode: "27", name: "Satara", censusCode: "023", lat: "17.6805", lng: "74.0183" },
    { id: "27-0024", stateCode: "27", name: "Solapur", censusCode: "024", lat: "17.6599", lng: "75.9064" },
    { id: "27-0025", stateCode: "27", name: "Thane", censusCode: "025", lat: "19.2183", lng: "72.9781" },
    { id: "27-0026", stateCode: "27", name: "Wardha", censusCode: "026", lat: "20.7453", lng: "78.6022" },
    { id: "27-0027", stateCode: "27", name: "Washim", censusCode: "027", lat: "20.1118", lng: "77.1328" },
    { id: "27-0028", stateCode: "27", name: "Yavatmal", censusCode: "028", lat: "20.3888", lng: "78.1204" },
  ];
  await db.insert(locationDistricts).values(maharashtraDistricts).onConflictDoNothing();

  // Taluks for Bagalkot
  await db.insert(locationTaluks).values([
    { id: "29-0572-T01", districtId: "29-0572", name: "Bagalkot", kgisTalukCode: "T01" },
    { id: "29-0572-T02", districtId: "29-0572", name: "Badami", kgisTalukCode: "T02" },
    { id: "29-0572-T03", districtId: "29-0572", name: "Bilagi", kgisTalukCode: "T03" },
    { id: "29-0572-T04", districtId: "29-0572", name: "Hungund", kgisTalukCode: "T04" },
    { id: "29-0572-T05", districtId: "29-0572", name: "Jamkhandi", kgisTalukCode: "T05" },
    { id: "29-0572-T06", districtId: "29-0572", name: "Mudhol", kgisTalukCode: "T06" },
  ]).onConflictDoNothing();

  // Taluks for Dharwad
  await db.insert(locationTaluks).values([
    { id: "29-0585-T01", districtId: "29-0585", name: "Dharwad", kgisTalukCode: "T01" },
    { id: "29-0585-T02", districtId: "29-0585", name: "Hubli", kgisTalukCode: "T02" },
    { id: "29-0585-T03", districtId: "29-0585", name: "Kalghatgi", kgisTalukCode: "T03" },
    { id: "29-0585-T04", districtId: "29-0585", name: "Navalgund", kgisTalukCode: "T04" },
    { id: "29-0585-T05", districtId: "29-0585", name: "Kundgol", kgisTalukCode: "T05" },
  ]).onConflictDoNothing();

  // Hoblis for Badami taluk
  await db.insert(locationHoblis).values([
    { id: "29-0572-T02-H01", talukId: "29-0572-T02", name: "Badami", kgisHobliCode: "H01" },
    { id: "29-0572-T02-H02", talukId: "29-0572-T02", name: "Guledgudda", kgisHobliCode: "H02" },
    { id: "29-0572-T02-H03", talukId: "29-0572-T02", name: "Kerur", kgisHobliCode: "H03" },
  ]).onConflictDoNothing();

  // Villages for Badami hobli
  await db.insert(locationVillages).values([
    { id: "29-0572-T02-H01-V001", hobliId: "29-0572-T02-H01", name: "Badami Town", kgisVillageCode: "V001", pinCode: "587201", centroidLat: "16.1800", centroidLng: "75.6800" },
    { id: "29-0572-T02-H01-V002", hobliId: "29-0572-T02-H01", name: "Aihole", kgisVillageCode: "V002", pinCode: "587124", centroidLat: "16.0000", centroidLng: "75.8833" },
    { id: "29-0572-T02-H01-V003", hobliId: "29-0572-T02-H01", name: "Pattadakal", kgisVillageCode: "V003", pinCode: "587118", centroidLat: "15.9500", centroidLng: "75.8167" },
    { id: "29-0572-T02-H01-V004", hobliId: "29-0572-T02-H01", name: "Banashankari", kgisVillageCode: "V004", pinCode: "587201", centroidLat: "16.0700", centroidLng: "75.7000" },
    { id: "29-0572-T02-H01-V005", hobliId: "29-0572-T02-H01", name: "Tengli", kgisVillageCode: "V005", pinCode: "587125", centroidLat: "16.1500", centroidLng: "75.6500" },
  ]).onConflictDoNothing();

  // Crop Phenology Calendar
  await db.insert(cropPhenologyCalendar).values([
    { cropType: "paddy", seasonType: "KHARIF", sowingMonthStart: 6, sowingMonthEnd: 7, harvestMonthStart: 10, harvestMonthEnd: 11, peakNdviMonth: 9, expectedPeakNdvi: "0.75", minHealthyNdvi: "0.45" },
    { cropType: "cotton", seasonType: "KHARIF", sowingMonthStart: 5, sowingMonthEnd: 6, harvestMonthStart: 11, harvestMonthEnd: 1, peakNdviMonth: 8, expectedPeakNdvi: "0.55", minHealthyNdvi: "0.30" },
    { cropType: "soybean", seasonType: "KHARIF", sowingMonthStart: 6, sowingMonthEnd: 7, harvestMonthStart: 9, harvestMonthEnd: 10, peakNdviMonth: 8, expectedPeakNdvi: "0.65", minHealthyNdvi: "0.40" },
    { cropType: "jowar", seasonType: "KHARIF", sowingMonthStart: 6, sowingMonthEnd: 7, harvestMonthStart: 9, harvestMonthEnd: 10, peakNdviMonth: 8, expectedPeakNdvi: "0.60", minHealthyNdvi: "0.35" },
    { cropType: "bajra", seasonType: "KHARIF", sowingMonthStart: 6, sowingMonthEnd: 7, harvestMonthStart: 9, harvestMonthEnd: 10, peakNdviMonth: 8, expectedPeakNdvi: "0.60", minHealthyNdvi: "0.35" },
    { cropType: "tur", seasonType: "KHARIF", sowingMonthStart: 6, sowingMonthEnd: 7, harvestMonthStart: 12, harvestMonthEnd: 2, peakNdviMonth: 10, expectedPeakNdvi: "0.55", minHealthyNdvi: "0.30" },
    { cropType: "wheat", seasonType: "RABI", sowingMonthStart: 11, sowingMonthEnd: 12, harvestMonthStart: 3, harvestMonthEnd: 4, peakNdviMonth: 2, expectedPeakNdvi: "0.70", minHealthyNdvi: "0.45" },
    { cropType: "gram", seasonType: "RABI", sowingMonthStart: 10, sowingMonthEnd: 11, harvestMonthStart: 2, harvestMonthEnd: 3, peakNdviMonth: 1, expectedPeakNdvi: "0.55", minHealthyNdvi: "0.30" },
    { cropType: "mustard", seasonType: "RABI", sowingMonthStart: 10, sowingMonthEnd: 11, harvestMonthStart: 2, harvestMonthEnd: 3, peakNdviMonth: 1, expectedPeakNdvi: "0.60", minHealthyNdvi: "0.35" },
    { cropType: "sugarcane", seasonType: "ANNUAL", sowingMonthStart: 1, sowingMonthEnd: 4, harvestMonthStart: 11, harvestMonthEnd: 3, peakNdviMonth: 8, expectedPeakNdvi: "0.80", minHealthyNdvi: "0.55" },
  ]).onConflictDoNothing();

  // Insurer Accounts
  await db.insert(insurerAccounts).values([
    { insurerCode: "AIC", insurerName: "Agriculture Insurance Company of India", states: ["29", "27", "36"], passwordHash: hashPassword("AIC@Insurer123") },
    { insurerCode: "NICL", insurerName: "New India Assurance Co. Ltd.", states: ["29", "27", "03"], passwordHash: hashPassword("NICL@Insurer123") },
    { insurerCode: "HDFC_ERGO", insurerName: "HDFC ERGO General Insurance", states: ["27", "09"], passwordHash: hashPassword("HDFC@Insurer123") },
    { insurerCode: "RELIANCE_GI", insurerName: "Reliance General Insurance", states: ["29", "08"], passwordHash: hashPassword("RGI@Insurer123") },
    { insurerCode: "BAJAJ_ALLIANZ", insurerName: "Bajaj Allianz General Insurance", states: ["27", "36"], passwordHash: hashPassword("BAJ@Insurer123") },
    { insurerCode: "SBI_GI", insurerName: "SBI General Insurance", states: ["29", "27", "09", "08"], passwordHash: hashPassword("SBIGI@Insurer123") },
  ]).onConflictDoNothing();

  // Admin Officers
  await db.insert(adminOfficers).values([
    {
      email: "superadmin@bhuvigyan.gov.in",
      fullName: "Super Administrator",
      mobile: "9000000001",
      role: "SUPER_ADMIN",
      passwordHash: hashPassword("Admin@123"),
      totpSecret: "DEMO_SECRET",
      jurisdiction: {},
      isDemo: true,
    },
    {
      email: "statehead.ka@bhuvigyan.gov.in",
      fullName: "Karnataka State Head",
      mobile: "9000000002",
      role: "STATE_HEAD",
      stateCode: "29",
      passwordHash: hashPassword("Admin@123"),
      totpSecret: "DEMO_SECRET",
      jurisdiction: { stateCode: "29" },
      isDemo: true,
    },
    {
      email: "dc.bagalkot@karnataka.gov.in",
      fullName: "District Collector Bagalkot",
      mobile: "9000000003",
      role: "DC",
      stateCode: "29",
      districtId: "29-0572",
      passwordHash: hashPassword("Admin@123"),
      totpSecret: "DEMO_SECRET",
      jurisdiction: { stateCode: "29", districtId: "29-0572" },
      isDemo: true,
    },
    {
      email: "officer.bagalkot@karnataka.gov.in",
      fullName: "District Officer Bagalkot",
      mobile: "9000000004",
      role: "DISTRICT_OFFICER",
      stateCode: "29",
      districtId: "29-0572",
      passwordHash: hashPassword("Admin@123"),
      totpSecret: "DEMO_SECRET",
      jurisdiction: { stateCode: "29", districtId: "29-0572" },
      isDemo: true,
    },
    {
      email: "inspector.badami@karnataka.gov.in",
      fullName: "Field Inspector Badami",
      mobile: "9000000005",
      role: "FIELD_INSPECTOR",
      stateCode: "29",
      districtId: "29-0572",
      talukId: "29-0572-T02",
      passwordHash: hashPassword("Admin@123"),
      totpSecret: "DEMO_SECRET",
      jurisdiction: { stateCode: "29", districtId: "29-0572", talukId: "29-0572-T02" },
      isDemo: true,
    },
  ]).onConflictDoNothing();

  // CSC Operators
  await db.insert(cscOperators).values([
    {
      cscId: "CSC-KA-0234",
      name: "Suresh Kumar CSC Center",
      mobile: "9800000001",
      email: "csc0234@karnataka.gov.in",
      districtId: "29-0572",
      isDemo: true,
    },
    {
      cscId: "CSC-KA-0235",
      name: "Mahesh Verma CSC Center",
      mobile: "9800000002",
      email: "csc0235@karnataka.gov.in",
      districtId: "29-0572",
      isDemo: true,
    },
  ]).onConflictDoNothing();

  // Demo Farmers
  const [farmer1] = await db.insert(farmers).values({
    mobile: "9900000001",
    fullName: "Ramesh Basavannappa Patil",
    stateCode: "29",
    preferredLanguage: "kn",
    isDemo: true,
  }).returning().onConflictDoNothing();

  const [farmer2] = await db.insert(farmers).values({
    mobile: "9900000002",
    fullName: "Savitri Mallikarjun Hegde",
    stateCode: "29",
    preferredLanguage: "kn",
    isDemo: true,
  }).returning().onConflictDoNothing();

  const [farmer3] = await db.insert(farmers).values({
    mobile: "9900000003",
    fullName: "Abdul Karim Shaikh",
    stateCode: "27",
    preferredLanguage: "mr",
    isDemo: true,
  }).returning().onConflictDoNothing();

  // Demo UDLRN records
  if (farmer1) {
    await db.insert(udlrnMaster).values({
      udlrn: "29-0572-A3F8C1-07",
      farmerId: farmer1.id,
      stateCode: "29",
      districtId: "29-0572",
      talukId: "29-0572-T02",
      hobliId: "29-0572-T02-H01",
      villageId: "29-0572-T02-H01-V001",
      surveyNumber: "123/A",
      kgisAreaHa: "2.4500",
      rtcAreaHa: "2.3800",
      landOwnerName: "Ramesh Basavannappa Patil",
      landUseType: "agricultural",
      soilType: "red",
      waterSource: "well",
      centroidLat: "16.1800",
      centroidLng: "75.6800",
      plotPolygonWkt: "POLYGON((75.678 16.178, 75.682 16.178, 75.682 16.182, 75.678 16.182, 75.678 16.178))",
      landsatBaselineNdvi: "0.6200",
      payoutAccountNo: "XXXX1234",
      payoutIfsc: "SBIN0001234",
      payoutBankName: "State Bank of India",
      declaredCrop: "paddy",
      isDemo: true,
    }).onConflictDoNothing();
  }

  if (farmer2) {
    await db.insert(udlrnMaster).values({
      udlrn: "29-0585-B2E9D4-15",
      farmerId: farmer2.id,
      stateCode: "29",
      districtId: "29-0585",
      talukId: "29-0585-T01",
      surveyNumber: "456/B",
      kgisAreaHa: "1.8000",
      rtcAreaHa: "1.7500",
      landOwnerName: "Savitri Mallikarjun Hegde",
      landUseType: "agricultural",
      soilType: "black",
      waterSource: "bore_well",
      centroidLat: "15.4589",
      centroidLng: "75.0078",
      plotPolygonWkt: "POLYGON((75.005 15.456, 75.010 15.456, 75.010 15.462, 75.005 15.462, 75.005 15.456))",
      landsatBaselineNdvi: "0.5800",
      payoutAccountNo: "XXXX5678",
      payoutIfsc: "UBIN0012345",
      payoutBankName: "Union Bank of India",
      declaredCrop: "cotton",
      isDemo: true,
    }).onConflictDoNothing();
  }

  if (farmer3) {
    await db.insert(udlrnMaster).values({
      udlrn: "27-0004-C1D7E5-23",
      farmerId: farmer3.id,
      stateCode: "27",
      districtId: "27-0004",
      surveyNumber: "789/C",
      kgisAreaHa: "3.2000",
      rtcAreaHa: "3.0000",
      landOwnerName: "Abdul Karim Shaikh",
      landUseType: "agricultural",
      soilType: "alluvial",
      waterSource: "canal",
      centroidLat: "19.8762",
      centroidLng: "75.3433",
      plotPolygonWkt: "POLYGON((75.340 19.874, 75.348 19.874, 75.348 19.880, 75.340 19.880, 75.340 19.874))",
      landsatBaselineNdvi: "0.7100",
      payoutAccountNo: "XXXX9012",
      payoutIfsc: "MAHB0000001",
      payoutBankName: "Bank of Maharashtra",
      declaredCrop: "soybean",
      isDemo: true,
    }).onConflictDoNothing();
  }

  // Demo Claims (all statuses)
  const claimsData = [
    {
      claimNumber: "PMFBY250600001",
      udlrn: "29-0572-A3F8C1-07",
      farmerId: farmer1?.id,
      season: "KHARIF-2025",
      seasonType: "KHARIF",
      damageType: "FLOOD",
      damageDate: "2025-09-15",
      declaredSowingDate: "2025-06-20",
      declaredCrop: "paddy",
      claimAmountRequested: "45000.00",
      status: "APPROVED",
      fraudScore: "18.5",
      fraudConfidence: "0.92",
      fraudFlags: [],
      ndviSowing: "0.6200",
      ndviClaim: "0.2100",
      ndviLossPct: "66.13",
      approvedAmount: "42500.00",
      isDemo: true,
    },
    {
      claimNumber: "PMFBY250600002",
      udlrn: "29-0585-B2E9D4-15",
      farmerId: farmer2?.id,
      season: "KHARIF-2025",
      seasonType: "KHARIF",
      damageType: "DROUGHT",
      damageDate: "2025-08-20",
      declaredSowingDate: "2025-05-25",
      declaredCrop: "cotton",
      claimAmountRequested: "38000.00",
      status: "OFFICER_REVIEW",
      fraudScore: "48.2",
      fraudConfidence: "0.78",
      fraudFlags: ["AREA_INFLATION"],
      ndviSowing: "0.5500",
      ndviClaim: "0.3200",
      ndviLossPct: "41.82",
      isDemo: true,
    },
    {
      claimNumber: "PMFBY250600003",
      udlrn: "27-0004-C1D7E5-23",
      farmerId: farmer3?.id,
      season: "KHARIF-2025",
      seasonType: "KHARIF",
      damageType: "PEST",
      damageDate: "2025-09-10",
      declaredSowingDate: "2025-06-15",
      declaredCrop: "soybean",
      claimAmountRequested: "52000.00",
      status: "REJECTED_FRAUD",
      fraudScore: "87.3",
      fraudConfidence: "0.95",
      fraudFlags: ["VAO_FALSIFICATION", "NDVI_HEALTHY_AT_CLAIM", "AREA_INFLATION"],
      ndviSowing: "0.7100",
      ndviClaim: "0.6800",
      ndviLossPct: "4.23",
      rejectionReason: "High fraud score (87/100): VAO mutation within 30 days, NDVI healthy at claim date, area inflation detected",
      isDemo: true,
    },
    {
      claimNumber: "PMFBY250600004",
      udlrn: "29-0572-A3F8C1-07",
      farmerId: farmer1?.id,
      season: "RABI-2025",
      seasonType: "RABI",
      damageType: "HAIL",
      damageDate: "2025-12-15",
      declaredSowingDate: "2025-11-10",
      declaredCrop: "wheat",
      claimAmountRequested: "28000.00",
      status: "CCE_VISIT",
      fraudScore: "65.0",
      fraudConfidence: "0.82",
      fraudFlags: ["NDVI_HEALTHY_AT_CLAIM"],
      ndviSowing: "0.6800",
      ndviClaim: "0.5500",
      ndviLossPct: "19.12",
      isDemo: true,
    },
    {
      claimNumber: "PMFBY250600005",
      udlrn: "29-0585-B2E9D4-15",
      farmerId: farmer2?.id,
      season: "RABI-2025",
      seasonType: "RABI",
      damageType: "CYCLONE",
      damageDate: "2025-11-28",
      declaredSowingDate: "2025-10-20",
      declaredCrop: "gram",
      claimAmountRequested: "21000.00",
      status: "FILED",
      fraudScore: null,
      isDemo: true,
    },
  ].filter((c) => c.farmerId);

  for (const claimData of claimsData) {
    await db.insert(claims).values(claimData as typeof claims.$inferInsert).onConflictDoNothing();
  }

  // Seed fraud heatmap data
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    for (const districtId of ["29-0572", "29-0585", "29-0595", "27-0020", "27-0004"]) {
      const total = Math.floor(Math.random() * 50);
      const fraud = Math.floor(total * (0.1 + Math.random() * 0.3));
      const fraudRate = total > 0 ? (fraud / total) * 100 : 0;
      await db.insert(fraudHeatmapDaily).values({
        districtId,
        computedDate: dateStr!,
        totalClaims: total,
        fraudClaims: fraud,
        approvedClaims: Math.floor((total - fraud) * 0.7),
        pendingClaims: Math.floor((total - fraud) * 0.3),
        fraudRate: fraudRate.toFixed(2),
        totalAmountRisk: String(total * 35000),
        amountSaved: String(fraud * 35000),
      }).onConflictDoNothing();
    }
  }

  // Notifications for demo farmers
  if (farmer1) {
    await db.insert(notifications).values([
      {
        farmerId: farmer1.id,
        recipientMobile: "9900000001",
        notificationType: "CLAIM_APPROVED",
        title: "Claim Approved",
        message: "Your claim PMFBY250600001 has been approved. ₹42,500 will be credited within 3 working days.",
        channel: "IN_APP",
      },
      {
        farmerId: farmer1.id,
        recipientMobile: "9900000001",
        notificationType: "CLAIM_FILED",
        title: "Claim Filed",
        message: "Your claim PMFBY250600004 has been filed. Field inspection scheduled.",
        channel: "IN_APP",
      },
    ]).onConflictDoNothing();
  }

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
