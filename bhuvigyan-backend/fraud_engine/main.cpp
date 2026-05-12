#include <iostream>
#include <cmath>
#include <string>
#include <sstream>
#include <map>

using namespace std;

int calculateFraudScore(const map<string, double>& numVals, const map<string, bool>& boolVals) {
    int score = 0;

    double ndvi = numVals.at("ndviAtClaim");
    bool isDuplicate = boolVals.at("isDuplicate");
    int cscClaimsToday = (int)numVals.at("cscClaimsToday");
    int rtcMutationDays = (int)numVals.at("rtcMutationDaysBefore");
    bool sarFloodConfirmed = boolVals.at("sarFloodConfirmed");
    int farmerPastFraud = (int)numVals.at("farmerPastFraudCount");
    double villageFraudRate = numVals.at("sameVillageFraudRate");
    bool cropMatches = boolVals.at("cropMatchesSatellite");
    double landAreaDelta = numVals.at("landAreaDelta");
    int historicalYears = (int)numVals.at("historicalFarmYears");

    if (ndvi > 0.6) score += 35;
    else if (ndvi > 0.4) score += 15;
    else if (ndvi < 0.2) score -= 10;

    if (isDuplicate) score += 50;

    if (rtcMutationDays < 15) score += 40;
    else if (rtcMutationDays < 30) score += 25;
    else if (rtcMutationDays < 90) score += 10;

    if (cscClaimsToday > 10) score += 20;
    else if (cscClaimsToday > 5) score += 10;
    else if (cscClaimsToday > 2) score += 5;

    if (sarFloodConfirmed) score -= 15;

    if (farmerPastFraud >= 3) score += 30;
    else if (farmerPastFraud >= 1) score += 15;

    if (villageFraudRate > 0.15) score += 15;
    else if (villageFraudRate > 0.08) score += 8;
    else if (villageFraudRate > 0.03) score += 3;

    if (!cropMatches) score += 20;

    if (abs(landAreaDelta) > 1.0) score += 10;

    if (historicalYears < 2 && score > 0) score += 10;

    return max(0, min(100, score));
}

string getVerdict(int score) {
    if (score <= 30) return "AUTO_APPROVE";
    if (score <= 60) return "OFFICER_REVIEW";
    if (score <= 80) return "MANDATORY_VISIT";
    return "AUTO_REJECT_FIR";
}

string extractString(const string& json, const string& key) {
    size_t kPos = json.find("\"" + key + "\"");
    if (kPos == string::npos) return "";
    size_t colon = json.find(":", kPos);
    if (colon == string::npos) return "";
    size_t quote1 = json.find("\"", colon);
    if (quote1 == string::npos) return "";
    size_t quote2 = json.find("\"", quote1 + 1);
    if (quote2 == string::npos) return "";
    return json.substr(quote1 + 1, quote2 - quote1 - 1);
}

double extractDouble(const string& json, const string& key, double def) {
    size_t kPos = json.find("\"" + key + "\"");
    if (kPos == string::npos) return def;
    size_t colon = json.find(":", kPos);
    if (colon == string::npos) return def;
    size_t valStart = colon + 1;
    while (valStart < json.size() && (json[valStart] == ' ' || json[valStart] == '\t')) valStart++;
    if (valStart >= json.size()) return def;
    if (json[valStart] == '"') {
        size_t endQuote = json.find("\"", valStart + 1);
        if (endQuote == string::npos) return def;
        string s = json.substr(valStart + 1, endQuote - valStart - 1);
        return atof(s.c_str());
    }
    size_t valEnd = valStart;
    while (valEnd < json.size() && (isdigit(json[valEnd]) || json[valEnd] == '.' || json[valEnd] == '-')) valEnd++;
    string numStr = json.substr(valStart, valEnd - valStart);
    return numStr.empty() ? def : atof(numStr.c_str());
}

bool extractBool(const string& json, const string& key, bool def) {
    size_t kPos = json.find("\"" + key + "\"");
    if (kPos == string::npos) return def;
    size_t colon = json.find(":", kPos);
    if (colon == string::npos) return def;
    size_t valStart = colon + 1;
    while (valStart < json.size() && (json[valStart] == ' ' || json[valStart] == '\t')) valStart++;
    if (valStart >= json.size()) return def;
    if (json.substr(valStart, 4) == "true") return true;
    if (json.substr(valStart, 5) == "false") return false;
    return def;
}

int main() {
    try {
        string jsonStr;
        getline(cin, jsonStr, '\0');

        if (jsonStr.empty() || jsonStr[0] != '{') {
            cout << "{\"error\":\"Invalid JSON\",\"fraudScore\":0,\"verdict\":\"ERROR\"}" << endl;
            return 1;
        }

        map<string, double> numVals;
        map<string, bool> boolVals;

        numVals["ndviAtClaim"] = extractDouble(jsonStr, "ndviAtClaim", 0.5);
        boolVals["isDuplicate"] = extractBool(jsonStr, "isDuplicate", false);
        numVals["cscClaimsToday"] = extractDouble(jsonStr, "cscClaimsToday", 0);
        numVals["rtcMutationDaysBefore"] = extractDouble(jsonStr, "rtcMutationDaysBefore", 999);
        boolVals["sarFloodConfirmed"] = extractBool(jsonStr, "sarFloodConfirmed", false);
        numVals["farmerPastFraudCount"] = extractDouble(jsonStr, "farmerPastFraudCount", 0);
        numVals["sameVillageFraudRate"] = extractDouble(jsonStr, "sameVillageFraudRate", 0.0);
        boolVals["cropMatchesSatellite"] = extractBool(jsonStr, "cropMatchesSatellite", true);
        numVals["landAreaDelta"] = extractDouble(jsonStr, "landAreaDelta", 0.0);
        numVals["historicalFarmYears"] = extractDouble(jsonStr, "historicalFarmYears", 0);

        int score = calculateFraudScore(numVals, boolVals);
        string verdict = getVerdict(score);

        cout << "{";
        cout << "\"fraudScore\":" << score << ",";
        cout << "\"verdict\":\"" << verdict << "\",";
        cout << "\"signals\":[";

        bool first = true;
        double ndvi = numVals["ndviAtClaim"];
        if (ndvi > 0.6) {
            if (!first) cout << ",";
            int ndviPct = (int)(ndvi * 100);
            cout << "{\"key\":\"NDVI_HEALTHY\",\"label\":\"NDVI " << ndviPct << " - healthy crop but damage claimed\",\"severity\":\"HIGH\",\"confidence\":0.85}";
            first = false;
        }

        if (boolVals["isDuplicate"]) {
            if (!first) cout << ",";
            cout << "{\"key\":\"DUPLICATE\",\"label\":\"Duplicate claim detected\",\"severity\":\"CRITICAL\",\"confidence\":1.0}";
            first = false;
        }

        int rtcDays = (int)numVals["rtcMutationDaysBefore"];
        if (rtcDays < 15) {
            if (!first) cout << ",";
            cout << "{\"key\":\"RTC_MUTATION\",\"label\":\"Land ownership changed " << rtcDays << " days before claim\",\"severity\":\"CRITICAL\",\"confidence\":0.95}";
            first = false;
        }

        if (boolVals["sarFloodConfirmed"]) {
            if (!first) cout << ",";
            cout << "{\"key\":\"SAR_FLOOD_CONFIRMED\",\"label\":\"SAR satellite confirms flood event\",\"severity\":\"LOW\",\"confidence\":0.90}";
        }

        cout << "],";
        cout << "\"features\":{}";
        cout << "}" << endl;

        return 0;
    } catch (const exception& e) {
        cout << "{\"error\":\"" << e.what() << "\",\"fraudScore\":0,\"verdict\":\"ERROR\"}" << endl;
        return 1;
    }
}