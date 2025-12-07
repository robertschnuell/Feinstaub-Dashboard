"use client";

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import '../lib/i18n';
import { io } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const APP_TITLE = process.env.NEXT_PUBLIC_APP_TITLE || 'Feinstaub Monitoring';
const APP_SUBTITLE = process.env.NEXT_PUBLIC_APP_SUBTITLE || 'Particle Sensor';

const TIME_RANGES = [
  { label: 'range.1h', hours: 1, points: 6 },
  { label: 'range.6h', hours: 6, points: 36 },
  { label: 'range.24h', hours: 24, points: 144 },
  { label: 'range.7d', hours: 168, points: 1008 },
  { label: 'range.30d', hours: 720, points: 4320 },
  { label: 'range.all', hours: null, points: null }
];

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [appConfig, setAppConfig] = useState({ title: APP_TITLE, subtitle: APP_SUBTITLE });
  const [currentData, setCurrentData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[1]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load app configuration
    fetch(`${BACKEND_URL}/api/config`)
      .then(res => res.json())
      .then(config => setAppConfig(config))
      .catch(err => console.error('Error loading configuration:', err));

    // Check saved authentication
    const savedAuth = localStorage.getItem('dashboard_auth');
    if (savedAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    fetchCurrentData();
    fetchHistoricalData(selectedRange.hours);
    
    const socket = io(BACKEND_URL);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      setError(null);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err);
      setError('Connection to server failed');
      setConnected(false);
    });
    
    socket.on('currentData', (data) => {
      console.log('📥 Current data received');
      setCurrentData(data);
      setLoading(false);
      setError(null);
    });
    
    socket.on('newData', (data) => {
      console.log('🔄 New data received');
      setCurrentData(data.current);
      setError(null);
      
      setHistoricalData(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const updated = [...prevArray, data.historical];
        if (selectedRange.hours) {
          const cutoffTime = new Date(Date.now() - selectedRange.hours * 60 * 60 * 1000);
          return updated.filter(entry => new Date(entry.time) >= cutoffTime);
        }
        return updated.slice(-1000);
      });
    });
    
    return () => {
      socket.disconnect();
    };
  }, [authenticated, selectedRange.hours]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('dashboard_auth', 'true');
        localStorage.setItem('dashboard_token', password);
        if (data.title) setAppConfig({ title: data.title, subtitle: data.subtitle });
        setAuthenticated(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      console.error('Login-Fehler:', err);
      setPasswordError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_auth');
    localStorage.removeItem('dashboard_token');
    setAuthenticated(false);
    setPassword('');
  };

  const fetchCurrentData = async () => {
    try {
      const token = localStorage.getItem('dashboard_token');
      const response = await fetch(`${BACKEND_URL}/api/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Fehler beim Laden');
      const data = await response.json();
      setCurrentData(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error loading current data:', err);
      setError('Error loading current data');
      setLoading(false);
    }
  };

  const fetchHistoricalData = async (hours) => {
    try {
      const token = localStorage.getItem('dashboard_token');
      const url = hours ? `${BACKEND_URL}/api/historical?hours=${hours}` : `${BACKEND_URL}/api/historical?hours=87600`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Fehler beim Laden');
      const data = await response.json();
      // Filter out entries with missing critical data (time must exist)
      const dataArray = Array.isArray(data) ? data : [];
      const validData = dataArray.filter(entry => entry && entry.time);
      setHistoricalData(validData);
      setError(null);
    } catch (err) {
      console.error('Error loading historical data:', err);
      setError('Error loading historical data');
    }
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    fetchHistoricalData(range.hours);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    if (selectedRange.hours <= 1) {
      // 1h: Nur Uhrzeit
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (selectedRange.hours <= 24) {
      // 6h-24h: Uhrzeit
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (selectedRange.hours <= 168) {
      // 7d: Wochentag + Uhrzeit
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit' });
    } else {
      // 30d+: Datum
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  // Prevent hydration mismatch - wait for client-side mount
  if (!mounted) {
    return null;
  }

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#2d2d2d] shadow-lg">
          <CardHeader className="border-b border-[#2d2d2d]">
            <CardTitle className="text-2xl text-[#2d2d2d] font-light tracking-wide">
              {appConfig.title.toUpperCase()}
            </CardTitle>
            <CardDescription className="text-[#666] uppercase text-xs tracking-wider">
              {appConfig.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.placeholder')}
                  className="w-full px-4 py-3 border border-[#2d2d2d] bg-white text-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-[#2d2d2d] font-light"
                  autoFocus
                />
              </div>
              {passwordError && (
                <Alert className="border-[#8b0000] bg-[#fff5f5]">
                  <AlertDescription className="text-[#8b0000] text-sm">
                    {t('login.error')}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full bg-[#2d2d2d] text-white hover:bg-[#1a1a1a] font-light tracking-wider uppercase text-sm">
                {t('login.button')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-[#2d2d2d] mb-4 font-light tracking-wide">{t('loading')}</div>
          {error && (
            <Alert className="border-[#8b0000] bg-[#fff5f5] max-w-md">
              <AlertDescription className="text-[#8b0000]">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#2d2d2d] sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-[#2d2d2d] tracking-wide">
                {appConfig.title.toUpperCase()}
              </h1>
              <p className="text-[#666] text-sm mt-1 uppercase tracking-wider">
                {appConfig.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2 px-3 h-9 bg-gray-50 border border-[#2d2d2d]">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#2d6d2d]' : 'bg-[#8b0000]'}`}></div>
                <span className="text-xs text-[#2d2d2d] uppercase tracking-wide font-mono">
                  {connected ? t('nav.live') : t('nav.offline')}
                </span>
              </div>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="h-9 px-2 border border-[#2d2d2d] text-[#2d2d2d] bg-white text-xs uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#2d2d2d]"
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
              </select>
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm"
                className="h-9 border-[#2d2d2d] text-[#2d2d2d] hover:bg-[#2d2d2d] hover:text-white font-light text-xs uppercase tracking-wider"
              >
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <Alert className="border-[#8b0000] bg-[#fff5f5]">
            <AlertDescription className="text-[#8b0000]">{error}</AlertDescription>
          </Alert>
        )}

        {/* Aktuelle Werte Grid */}
        {currentData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-[#2d2d2d] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-light text-[#666] uppercase tracking-wider">PM2.5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-light text-[#2d2d2d] tracking-tight font-mono">
                  {currentData.decoded_payload?.pm2_5_mass_ugm3?.toFixed(2) || '—'}
                </div>
                <p className="text-xs text-[#999] mt-1 uppercase tracking-wide">μg/m³</p>
              </CardContent>
            </Card>

            <Card className="border-[#2d2d2d] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-light text-[#666] uppercase tracking-wider">PM10</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-light text-[#2d2d2d] tracking-tight font-mono">
                  {currentData.decoded_payload?.pm10_mass_ugm3?.toFixed(2) || '—'}
                </div>
                <p className="text-xs text-[#999] mt-1 uppercase tracking-wide">μg/m³</p>
              </CardContent>
            </Card>

            <Card className="border-[#2d2d2d] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-light text-[#666] uppercase tracking-wider">{t('current.temperature')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-light text-[#2d2d2d] tracking-tight font-mono">
                  {currentData.decoded_payload?.temperature_C?.toFixed(1) || '—'}
                </div>
                <p className="text-xs text-[#999] mt-1 uppercase tracking-wide">°C</p>
              </CardContent>
            </Card>

            <Card className="border-[#2d2d2d] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-light text-[#666] uppercase tracking-wider">{t('current.humidity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-light text-[#2d2d2d] tracking-tight font-mono">
                  {currentData.decoded_payload?.humidity_rel?.toFixed(1) || '—'}
                </div>
                <p className="text-xs text-[#999] mt-1 uppercase tracking-wide">%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Zeitraum Auswahl */}
        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.label}
              onClick={() => handleRangeChange(range)}
              variant={selectedRange.label === range.label ? "default" : "outline"}
              size="sm"
              className={
                selectedRange.label === range.label
                  ? "bg-[#2d2d2d] text-white hover:bg-[#1a1a1a] font-light uppercase tracking-wider"
                  : "border-[#2d2d2d] text-[#2d2d2d] hover:bg-[#2d2d2d] hover:text-white font-light uppercase tracking-wider"
              }
            >
              {t(range.label)}
            </Button>
          ))}
        </div>

        {/* Partikel-Masse Verlauf (alle PM) */}
        <Card className="border-[#2d2d2d] bg-white shadow-sm">
          <CardHeader className="border-b border-[#e5e5e5]">
            <CardTitle className="text-lg font-light text-[#2d2d2d] uppercase tracking-wider">
              {t('chart.particleMass.title')}
            </CardTitle>
            <CardDescription className="text-[#666] text-xs uppercase tracking-wide">
              {selectedRange.points ? t('chart.particleMass.description', { range: t(selectedRange.label), points: selectedRange.points }) : t('chart.particleMass.descriptionAll', { range: t(selectedRange.label) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{ pm1: { color: "#2d2d2d" }, pm25: { color: "#666" }, pm4: { color: "#999" }, pm10: { color: "#ccc" } }} className="w-full h-[300px] md:h-[350px]">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  stroke="#666"
                  style={{ fontSize: '11px', fontWeight: '300' }}
                  minTickGap={50}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#666"
                  style={{ fontSize: '11px', fontWeight: '300' }}
                  label={{ value: t('chart.label.massConcentration'), angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '300' }} />
                <Line type="monotone" dataKey="pm1_mass_ugm3" stroke="#2d2d2d" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm1')} />
                <Line type="monotone" dataKey="pm2_5_mass_ugm3" stroke="#666" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm25')} />
                <Line type="monotone" dataKey="pm4_mass_ugm3" stroke="#999" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm4')} />
                <Line type="monotone" dataKey="pm10_mass_ugm3" stroke="#ccc" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm10')} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Partikel-Anzahl Verlauf */}
        <Card className="border-[#2d2d2d] bg-white shadow-sm">
          <CardHeader className="border-b border-[#e5e5e5]">
            <CardTitle className="text-lg font-light text-[#2d2d2d] uppercase tracking-wider">
              {t('chart.particleCount.title')}
            </CardTitle>
            <CardDescription className="text-[#666] text-xs uppercase tracking-wide">
              {t('chart.particleCount.description', { range: t(selectedRange.label) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{ pm1c: { color: "#2d6d2d" }, pm25c: { color: "#4d8d4d" }, pm10c: { color: "#6dad6d" } }} className="w-full h-[300px] md:h-[350px]">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  stroke="#666"
                  style={{ fontSize: '11px', fontWeight: '300' }}
                  minTickGap={50}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#666"
                  style={{ fontSize: '11px', fontWeight: '300' }}
                  label={{ value: t('chart.label.particleCount'), angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '300' }} />
                <Line type="monotone" dataKey="pm1_count_cm3" stroke="#2d6d2d" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm1Count')} />
                <Line type="monotone" dataKey="pm2_5_count_cm3" stroke="#4d8d4d" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm25Count')} />
                <Line type="monotone" dataKey="pm10_count_cm3" stroke="#6dad6d" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.pm10Count')} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Typische Partikelgröße Verlauf */}
        <Card className="border-[#2d2d2d] bg-white shadow-sm">
          <CardHeader className="border-b border-[#e5e5e5]">
            <CardTitle className="text-lg font-light text-[#2d2d2d] uppercase tracking-wider">
              {t('chart.particleSize.title')}
            </CardTitle>
            <CardDescription className="text-[#666] text-xs uppercase tracking-wide">
              {t('chart.particleSize.description', { range: t(selectedRange.label) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{ size: { color: "#2d2d2d" } }} className="w-full h-[250px] md:h-[300px]">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTime}
                  stroke="#666"
                  style={{ fontSize: '11px', fontWeight: '300' }}
                  minTickGap={40}
                  angle={-45}
                  textAnchor="end"
                  height={55}
                />
                <YAxis 
                  stroke="#666"
                  style={{ fontSize: '11px', fontWeight: '300' }}
                  label={{ value: t('chart.label.size'), angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="typical_particle_size" stroke="#2d2d2d" strokeWidth={2} dot={false} connectNulls={false} name={t('chart.label.particleSize')} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Temperatur & Luftfeuchtigkeit */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-[#2d2d2d] bg-white shadow-sm">
            <CardHeader className="border-b border-[#e5e5e5]">
            <CardTitle className="text-lg font-light text-[#2d2d2d] uppercase tracking-wider">
              {t('chart.temperature.title')}
            </CardTitle>
            <CardDescription className="text-[#666] text-xs uppercase tracking-wide">
              {t('chart.temperature.description', { range: t(selectedRange.label) })}
            </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={{ temp: { color: "#8b4513" } }} className="w-full h-[200px] md:h-[250px]">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={formatTime}
                    stroke="#666"
                    style={{ fontSize: '11px', fontWeight: '300' }}
                    minTickGap={40}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis 
                    stroke="#666"
                    style={{ fontSize: '11px', fontWeight: '300' }}
                    label={{ value: t('chart.label.temperature'), angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="temperature_C" stroke="#8b4513" strokeWidth={2} dot={false} connectNulls={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-[#2d2d2d] bg-white shadow-sm">
            <CardHeader className="border-b border-[#e5e5e5]">
            <CardTitle className="text-lg font-light text-[#2d2d2d] uppercase tracking-wider">
              {t('chart.humidity.title')}
            </CardTitle>
            <CardDescription className="text-[#666] text-xs uppercase tracking-wide">
              {t('chart.humidity.description', { range: t(selectedRange.label) })}
            </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={{ humidity: { color: "#4682b4" } }} className="w-full h-[200px] md:h-[250px]">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={formatTime}
                    stroke="#666"
                    style={{ fontSize: '11px', fontWeight: '300' }}
                    minTickGap={40}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis 
                    stroke="#666"
                    style={{ fontSize: '11px', fontWeight: '300' }}
                    label={{ value: t('chart.label.humidity'), angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="humidity_rel" stroke="#4682b4" strokeWidth={2} dot={false} connectNulls={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center text-[#999] text-xs py-8 border-t border-[#e5e5e5] tracking-wider">
          <p className="font-mono uppercase">{t('footer.lastUpdate')}: {currentData ? new Date(currentData.received_at).toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US') : '—'}</p>
          <p className="mt-3 text-[11px] leading-relaxed">
            {t('footer.dashboard')}{' '}
            <a 
              href="https://de.elv.com/p/elv-lorawan-feinstaubsensor-elv-lw-spm-P160408/?itemId=160408" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#2d2d2d] hover:underline"
            >
              {t('footer.sensor')}
            </a>
            {' '}{t('footer.with')}
          </p>
          <p className="mt-3 text-[10px] font-mono">
            {t('footer.madeBy')}{' '}
            <a 
              href="https://rfws.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#2d2d2d] hover:underline"
            >
              rfws.dev
            </a>
            {' '}• {t('footer.license')}
          </p>
        </div>
      </main>
    </div>
  );
}
