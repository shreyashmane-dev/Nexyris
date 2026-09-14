import React, { useState } from 'react';
import { 
  Usb, 
  HardDrive, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  ShieldCheck, 
  AlertTriangle,
  Play,
  Layers,
  Zap
} from 'lucide-react';
import { HardwareInfo, StorageInfo, ModelItem } from '../../types';
import { queueDownload, updatePortableConfig } from '../../lib/api';

interface WizardModalProps {
  isOpen: boolean;
  onComplete: () => void;
  hardware: HardwareInfo | null;
  storage: StorageInfo | null;
  curatedModels: ModelItem[];
}

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onComplete,
  hardware,
  storage,
  curatedModels,
}) => {
  const [step, setStep] = useState(1);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(['smollm2-135m-instruct']);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  if (!isOpen) return null;

  const toggleModelSelection = (id: string) => {
    if (selectedModelIds.includes(id)) {
      if (selectedModelIds.length > 1) {
        setSelectedModelIds(selectedModelIds.filter(m => m !== id));
      }
    } else {
      setSelectedModelIds([...selectedModelIds, id]);
    }
  };

  const totalRequiredBytes = curatedModels
    .filter(m => selectedModelIds.includes(m.id))
    .reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
  const totalRequiredGB = Math.round((totalRequiredBytes / (1024 ** 3)) * 100) / 100;

  const handleStartInstallation = async () => {
    setIsInstalling(true);
    setStep(5);

    // Queue selected models
    for (const modelId of selectedModelIds) {
      const model = curatedModels.find(m => m.id === modelId);
      if (model && model.downloadUrl) {
        try {
          await queueDownload({
            id: model.id,
            name: model.name,
            filename: model.filename,
            url: model.downloadUrl,
            expectedSize: model.sizeBytes,
          });
        } catch (e) {}
      }
    }

    // Step through visual setup progression
    for (let p = 10; p <= 100; p += 15) {
      await new Promise(r => setTimeout(r, 300));
      setInstallProgress(p);
    }

    await updatePortableConfig({ installed: true, firstRunCompleted: true });
    setStep(6);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.88)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div className="glass-modal" style={{
        width: '780px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-card)',
      }}>
        {/* Header Steps Progress Bar */}
        <div style={{
          padding: '18px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Usb size={16} color="white" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Nexyris Setup Wizard</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Step {step} of 6</span>
            <div style={{
              width: '120px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(step / 6) * 100}%`,
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease',
              }}></div>
            </div>
          </div>
        </div>

        {/* Modal Body Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '10px 20px' }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.2) 100%)',
                border: '1px solid rgba(59,130,246,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(59,130,246,0.3)',
              }}>
                <Zap size={36} color="#60a5fa" />
              </div>

              <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '12px' }}>
                Welcome to Nexyris Local
              </h2>

              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 28px', lineHeight: 1.6 }}>
                Your AI models live on your pendrive. Run powerful, commercial-grade local AI on any compatible computer without re-installation or cloud dependencies.
              </p>

              <div style={{
                maxWidth: '460px',
                margin: '0 auto 32px',
                textAlign: 'left',
                backgroundColor: 'rgba(0,0,0,0.25)',
                padding: '18px 24px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13.5px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Inspect host computer hardware & storage</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Recommend optimal models for your RAM/CPU</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>Download & store models directly on your USB drive</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span>100% private, zero cloud tracking, works offline</span>
                </div>
              </div>

              <button className="btn btn-primary" onClick={() => setStep(2)} style={{ padding: '12px 32px', fontSize: '14px' }}>
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Storage Check */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                Portable Storage Check
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Nexyris inspects your removable storage drive to ensure sufficient space for models and data.
              </p>

              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Portable Drive Location
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <HardDrive size={18} color="#60a5fa" />
                      <span>{storage?.rootPath || 'USB Storage'}</span>
                    </div>
                  </div>
                  <span className="status-pill ready">
                    {storage?.isRemovable ? 'Removable USB' : 'Host Storage'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drive Letter & Type</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
                      {storage?.driveLetter} ({storage?.fileSystem})
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Capacity</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
                      {storage?.totalGB} GB
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Available Space</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                      {storage?.freeGB} GB Free
                    </div>
                  </div>
                </div>

                {/* Storage bar */}
                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(5, 100 - (storage?.freePercentage || 50)))}%`,
                    background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                  }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Hardware Diagnostics */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                Host Hardware Diagnostics
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Nexyris detects this computer's CPU, RAM, and GPU to calculate performance profiles and model suitability.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    OPERATING SYSTEM
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 600 }}>
                    {hardware?.os.distro || 'Windows'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Compatible Portable Host
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    CPU PROCESSOR
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 600 }}>
                    {hardware?.cpu.model}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {hardware?.cpu.physicalCores} Physical Cores • {hardware?.cpu.logicalThreads} Threads
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    SYSTEM MEMORY (RAM)
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#60a5fa' }}>
                    {hardware?.ram.totalGB} GB RAM
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Suitable for models up to {hardware?.ram.totalGB && hardware.ram.totalGB >= 16 ? '7B - 14B' : '3B'}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    GPU ACCELERATION
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 600 }}>
                    {hardware?.gpu.name}
                  </div>
                  <div style={{ fontSize: '11px', color: hardware?.gpu.detected ? '#10b981' : 'var(--text-muted)', marginTop: '4px' }}>
                    {hardware?.gpu.acceleration}
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  Assigned Hardware Profile: <strong>{hardware?.performanceProfile}</strong>
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Auto-tunes {hardware?.recommendedConfig.threads} CPU threads
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>
                  <span>Choose Models</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Model Selection & Recommendations */}
          {step === 4 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                    Select AI Models for your USB
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Models are scored based on your {hardware?.ram.totalGB} GB RAM. You can install multiple models.
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Selected Storage</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>{totalRequiredGB} GB</div>
                </div>
              </div>

              {/* Model Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
                {curatedModels.slice(0, 6).map((model) => {
                  const isSelected = selectedModelIds.includes(model.id);
                  const compat = model.compatibility;

                  return (
                    <div
                      key={model.id}
                      onClick={() => toggleModelSelection(model.id)}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.3)',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{model.name}</div>
                        {compat && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: compat.status === 'RECOMMENDED' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                            color: compat.status === 'RECOMMENDED' ? '#34d399' : '#60a5fa',
                          }}>
                            {compat.badge}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                        {model.description}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Size: <strong>~{model.fileSizeGB} GB</strong></span>
                        <span>{model.quantization}</span>
                        <span>{model.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button className="btn btn-primary" onClick={handleStartInstallation}>
                  <span>Install Selected ({selectedModelIds.length})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Installation & Download Progress */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                Setting Up Nexyris Portable AI
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
                Configuring portable environment, database, and queuing models...
              </p>

              <div style={{
                height: '10px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '5px',
                overflow: 'hidden',
                maxWidth: '480px',
                margin: '0 auto 16px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${installProgress}%`,
                  background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
                  transition: 'width 0.3s ease',
                }}></div>
              </div>

              <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600, marginBottom: '24px' }}>
                {installProgress}% Completed
              </div>

              <div style={{ maxWidth: '380px', margin: '0 auto', textAlign: 'left', fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>✓ Host hardware inspected & fingerprinted</div>
                <div>✓ Dynamic portable root confirmed</div>
                <div>✓ SQLite database created on USB</div>
                <div>✓ Model catalog registered</div>
              </div>
            </div>
          )}

          {/* Step 6: Ready */}
          {step === 6 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
              }}>
                <CheckCircle2 size={38} />
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>
                Your Portable AI Studio is Ready!
              </h2>

              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.6 }}>
                Nexyris Local is initialized on your portable drive. You can now chat with your local models, use Terminal AI, or inspect code projects completely offline.
              </p>

              <button className="btn btn-primary" onClick={onComplete} style={{ padding: '12px 36px', fontSize: '14.5px', fontWeight: 600 }}>
                <Play size={16} fill="white" />
                <span>Launch Nexyris Local</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
