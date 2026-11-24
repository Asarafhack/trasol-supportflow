import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Cpu,
  Zap,
  Terminal,
  Play,
  ArrowRight,
  ShieldAlert,
  Server,
  RefreshCw,
} from 'lucide-react';

export const LiveTroubleshootingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDept, setSelectedDept] = useState('hardware');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testComplete, setTestComplete] = useState(false);

  const departments = [
    {
      id: 'hardware',
      name: 'Hardware & Sensor Diagnostics',
      icon: Cpu,
      description: 'Edge gateway microcontrollers, I2C/SPI sensor bus, CPU thermal throttle, hardware watchdog',
      color: 'indigo',
    },
    {
      id: 'network',
      name: 'MQTT & Network Connectivity',
      icon: Wifi,
      description: 'Broker handshake port 8883/1883, TLS cipher suites, cellular APN fallback, packet loss',
      color: 'blue',
    },
    {
      id: 'power',
      name: 'Power & Voltage RMA',
      icon: Zap,
      description: '24V DC input rail stability, brownout protection, battery backup depletion, surge faults',
      color: 'amber',
    },
    {
      id: 'cloud',
      name: 'Cloud Telemetry & Sync',
      icon: Server,
      description: 'Time-series ingestion queue, payload schema validation, database sync lag, API gateway',
      color: 'purple',
    },
  ];

  const runDiagnosticTest = () => {
    setIsRunningTest(true);
    setTestLogs([]);
    setTestComplete(false);

    const steps = [
      `[INIT] Initializing hardware diagnostic agent for ${selectedDept.toUpperCase()}...`,
      `[PROBE 1/4] Checking local physical link integrity... OK (Latency: 2ms)`,
      `[PROBE 2/4] Testing Trasol Edge MQTT broker connection on port 8883 TLS... CONNECTED (38ms)`,
      `[PROBE 3/4] Validating cryptographic firmware signatures and boot checksums... PASSED`,
      `[PROBE 4/4] Scanning sensor telemetry bus for dropped frame packets... 0 dropped frames`,
      `[SUMMARY] System telemetry healthy. Minor latency jitter detected on secondary gateway failover.`,
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setTestLogs((prev) => [...prev, step]);
        if (index === steps.length - 1) {
          setIsRunningTest(false);
          setTestComplete(true);
        }
      }, (index + 1) * 450);
    });
  };

  const handleEscalateToCritical = () => {
    navigate('/customer/tickets/create?priority=Critical&category=Product+Defect&subject=Critical+Hardware+Fault+Detected');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-indigo-900/50 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              Real-Time Diagnostic Workbench
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Critical Department Troubleshooting & Diagnostics
            </h1>
            <p className="text-sm text-indigo-200/80 max-w-2xl">
              Execute live diagnostic probes on enterprise hardware, inspect MQTT communication channels, or instantly escalate hardware failures with dual priority alerts.
            </p>
          </div>
          <button
            onClick={handleEscalateToCritical}
            className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/30 transition transform hover:-translate-y-0.5 whitespace-nowrap"
          >
            <ShieldAlert className="w-5 h-5" />
            Raise Critical Incident Ticket
          </button>
        </div>
      </div>

      {/* Department Selector Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Select Department Domain
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDept === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDept(dept.id);
                  setTestLogs([]);
                  setTestComplete(false);
                }}
                className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {dept.description}
                  </p>
                </div>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-4">
                    Active Target <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Probe Execution Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl text-slate-200 flex flex-col">
          <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-slate-300">
                live_probe_diagnostics.sh --target={selectedDept}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
          </div>

          <div className="p-5 font-mono text-xs flex-1 min-h-[220px] max-h-[300px] overflow-y-auto space-y-2 bg-slate-950/70">
            {testLogs.length === 0 && !isRunningTest && (
              <div className="text-slate-500 italic py-12 text-center">
                Click &ldquo;Execute Live Probe&rdquo; below to run end-to-end telemetry and hardware connectivity diagnostics.
              </div>
            )}
            {testLogs.map((log, index) => (
              <div
                key={index}
                className={`leading-relaxed ${
                  log.includes('[SUMMARY]')
                    ? 'text-indigo-300 font-bold'
                    : log.includes('PASSED') || log.includes('CONNECTED') || log.includes('OK')
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {log}
              </div>
            ))}
            {isRunningTest && (
              <div className="flex items-center gap-2 text-indigo-400 animate-pulse pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running real-time packet inspection...</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 px-5 py-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={runDiagnosticTest}
              disabled={isRunningTest}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunningTest ? 'Testing Network...' : 'Execute Live Probe'}
            </button>
            {testComplete && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle className="w-4 h-4" /> Diagnostics Completed
              </span>
            )}
          </div>
        </div>

        {/* Guided Actions Box */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Resolution Protocols
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Standard operating procedure for {selectedDept.toUpperCase()} troubleshooting:
            </p>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 rounded text-indigo-600" id="step1" />
                <label htmlFor="step1" className="cursor-pointer">
                  Inspect physical terminal wiring & verify 24V DC auxiliary power rails.
                </label>
              </li>
              <li className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 rounded text-indigo-600" id="step2" />
                <label htmlFor="step2" className="cursor-pointer">
                  Verify MQTT client ID matches serial certificate inside hardware flash.
                </label>
              </li>
              <li className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 rounded text-indigo-600" id="step3" />
                <label htmlFor="step3" className="cursor-pointer">
                  Perform soft power reboot via DIP switch 4 to refresh IP lease.
                </label>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={handleEscalateToCritical}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Escalate directly to Tier-3 Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Dispatches automated confirmation email + owner notification immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
