// components/SafetyDashboard.jsx
import { useState, useEffect } from 'react';

const SafetyDashboard = ({ crimeData, loadsheddingData }) => {
  const [selectedArea, setSelectedArea] = useState('Hanover Park');
  const [forecasts, setForecasts] = useState([]);
  const [areaStatistics, setAreaStatistics] = useState(null);

  // Get unique neighborhoods from crime data
  const areas = [...new Set(crimeData.map(crime => crime.NEIGHBOURHOOD))];

  useEffect(() => {
    generateForecast();
    calculateStatistics();
  }, [selectedArea]);

  const generateForecast = () => {
    const predictor = new PredictiveAnalysis(crimeData, loadsheddingData);
    const forecasts = [];
    const today = new Date().toISOString().split('T')[0];
    
    for (let hour = 0; hour < 24; hour++) {
      const prediction = predictor.predictRiskForTimeSlot(selectedArea, hour, today);
      forecasts.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        ...prediction
      });
    }
    
    setForecasts(forecasts);
  };

  const calculateStatistics = () => {
    const predictor = new PredictiveAnalysis(crimeData, loadsheddingData);
    const stats = predictor.analyzeAreaPatterns(selectedArea);
    setAreaStatistics(stats);
  };

  const getSafetyStatus = (riskScore) => {
    if (riskScore <= 3) return { status: "LOW", emoji: "🟢", color: "#10B981" };
    if (riskScore <= 6) return { status: "MEDIUM", emoji: "🟡", color: "#F59E0B" };
    return { status: "HIGH", emoji: "🔴", color: "#EF4444" };
  };

  return (
    <div className="dashboard p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">24-Hour Safety Forecast</h1>
      <p className="text-gray-600 mb-6">
        Predictive analysis based on crime patterns and load-shedding schedules
      </p>
      
      {/* Area Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Neighborhood:</label>
        <select 
          value={selectedArea} 
          onChange={(e) => setSelectedArea(e.target.value)}
          className="border rounded-lg p-2 w-full md:w-64"
        >
          {areas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
      </div>

      {/* Statistics Overview */}
      {areaStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{areaStatistics.totalCrimes}</div>
            <div className="text-sm text-gray-600">Total Crimes</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">
              {Math.round(areaStatistics.loadSheddingImpact * 100)}%
            </div>
            <div className="text-sm text-gray-600">During Load-shedding</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {areaStatistics.crimesDuringLoadshedding}
            </div>
            <div className="text-sm text-gray-600">Load-shedding Crimes</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(areaStatistics.crimesByHour).length}
            </div>
            <div className="text-sm text-gray-600">Active Hours</div>
          </div>
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {selectedArea} - 24-Hour Safety Timeline
        </h2>
        
        <div className="flex overflow-x-auto pb-4 gap-1 mb-2">
          {forecasts.map((forecast) => {
            const safety = getSafetyStatus(forecast.riskScore);
            const isCurrent = forecast.hour === new Date().getHours();
            
            return (
              <div 
                key={forecast.hour} 
                className={`flex flex-col items-center transition-all min-w-12 ${
                  isCurrent ? 'scale-110 transform' : ''
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white cursor-help relative"
                  style={{ backgroundColor: safety.color }}
                  title={`${forecast.time} - Risk: ${forecast.riskScore}/10 - ${safety.status}`}
                >
                  {safety.emoji}
                  {forecast.isLoadShedding && (
                    <span className="absolute -top-1 -right-1 text-xs">⚡</span>
                  )}
                </div>
                <div className="text-xs mt-1 font-medium">{forecast.time}</div>
                <div className="text-xs text-gray-500">{forecast.riskScore}</div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Low Risk (1-3)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Medium Risk (4-6)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>High Risk (7-10)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⚡</span>
            <span>Load-shedding</span>
          </div>
        </div>
      </div>

      {/* Detailed Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {forecasts
          .filter(f => f.hour >= 16 || f.hour <= 8) // Show evening/morning hours
          .map(forecast => {
            const safety = getSafetyStatus(forecast.riskScore);
            
            return (
              <div 
                key={forecast.hour} 
                className="bg-white rounded-lg shadow-md p-4 border-l-4"
                style={{ borderLeftColor: safety.color }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{forecast.time}</h3>
                  <div className="text-right">
                    <span className="text-2xl">{safety.emoji}</span>
                    <div className="text-sm font-medium" style={{ color: safety.color }}>
                      {safety.status}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Risk Score: </span>
                    <span style={{ color: safety.color }}>
                      {forecast.riskScore}/10
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Load-shedding: </span>
                    <span className={forecast.isLoadShedding ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {forecast.isLoadShedding ? 
                        `Stage ${forecast.loadSheddingStage} ⚡` : 
                        'None ✅'
                      }
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Confidence: </span>
                    <span>{forecast.confidence}%</span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Historical Data: </span>
                    <span>{forecast.historicalCrimes} crime{forecast.historicalCrimes !== 1 ? 's' : ''} at this hour</span>
                  </div>
                  
                  {forecast.factors.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Risk Factors:</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {forecast.factors.map((factor, index) => (
                          <li key={index}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Peak Risk Hours */}
      {areaStatistics && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Peak Risk Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Highest Risk Hours</h3>
              {Object.entries(areaStatistics.crimesByHour)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([hour, count]) => (
                  <div key={hour} className="flex justify-between items-center py-2 border-b">
                    <span>{hour.padStart(2, '0')}:00</span>
                    <span className="font-medium">{count} crimes</span>
                  </div>
                ))}
            </div>
            <div>
              <h3 className="font-medium mb-2">Load-shedding Impact</h3>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {Math.round(areaStatistics.loadSheddingImpact * 100)}%
                </div>
                <div className="text-gray-600">
                  of crimes occur during load-shedding
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyDashboard;