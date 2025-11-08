import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Utility: calculate risk level based on crime + load-shedding overlap
const calculateRiskIndex = (crime, loadshedding) => {
  let risk = 0;

  // Weight crimes more if they occur near or during load-shedding
  const matchingLoad = loadshedding.find(ls =>
    ls.areas_affected.some(a => crime.NEIGHBOURHOOD.toLowerCase().includes(a.toLowerCase())) &&
    Math.abs(new Date(`${crime.YEAR}-${crime.MONTH}-${crime.DAY}`).getTime() - new Date(ls.date).getTime()) < 24 * 60 * 60 * 1000
  );

  if (matchingLoad) {
    risk += 40 + matchingLoad.stage * 10;
  }

  // Adjust for crime type severity
  const severeCrimes = ["Murder", "Robbery", "Assault", "Hijacking"];
  if (severeCrimes.includes(crime.TYPE)) risk += 30;
  else risk += 10;

  // Adjust for time of day
  const nightHours = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4];
  if (nightHours.includes(parseInt(crime.HOUR))) risk += 20;

  return Math.min(100, risk);
};

const PredictiveDashboard = () => {
  const [crimeData, setCrimeData] = useState([]);
  const [loadData, setLoadData] = useState([]);
  const [riskSummary, setRiskSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const crimeRes = await fetch("/assets/data/filtered2010-2025.json");
        const loadRes = await fetch("/assets/data/loadshedding.json");

        const crimes = await crimeRes.json();
        const loads = await loadRes.json();

        setCrimeData(crimes);
        setLoadData(loads);

        // Aggregate by neighborhood
        const grouped = {};
        crimes.forEach(crime => {
          const risk = calculateRiskIndex(crime, loads);
          const key = crime.NEIGHBOURHOOD;
          if (!grouped[key]) grouped[key] = { neighbourhood: key, risk: 0, count: 0 };
          grouped[key].risk += risk;
          grouped[key].count += 1;
        });

        const summary = Object.values(grouped).map(g => ({
          neighbourhood: g.neighbourhood,
          avgRisk: parseFloat((g.risk / g.count).toFixed(2)),
          totalCrimes: g.count,
        }));

        setRiskSummary(summary);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  // Sort by highest risk
  const topRisk = [...riskSummary].sort((a, b) => b.avgRisk - a.avgRisk).slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Predictive Safety Dashboard</h2>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">Top High-Risk Areas (Crime + Load-shedding)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topRisk.map((area, i) => (
              <div
                key={i}
                className="p-3 border rounded-xl shadow-sm bg-red-50 flex flex-col justify-between"
              >
                <span className="font-semibold">{area.neighbourhood}</span>
                <span className="text-sm text-gray-600">
                  Avg Risk Index: {area.avgRisk}
                </span>
                <span className="text-sm text-gray-600">
                  Crimes Recorded: {area.totalCrimes}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Predicted Crime Risk Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={topRisk}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="neighbourhood" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="avgRisk" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => window.location.reload()}>Refresh Predictions</Button>
      </div>
    </div>
  );
};

export default PredictiveDashboard;
