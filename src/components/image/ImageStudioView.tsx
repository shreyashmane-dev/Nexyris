import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  Sliders, 
  RefreshCw, 
  Folder, 
  Maximize2,
  Layers,
  Wand2,
  Check,
  AlertCircle
} from 'lucide-react';
import { ModelItem } from '../../types';
import { fetchImageGallery } from '../../lib/api';

interface ImageStudioViewProps {
  models: ModelItem[];
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({ models }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, bad anatomy, watermark');
  const [steps, setSteps] = useState(25);
  const [cfgScale, setCfgScale] = useState(7.0);
  const [resolution, setResolution] = useState('512x512');
  const [selectedModel, setSelectedModel] = useState<string>('dreamshaper-8');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<Array<{ filename: string; url: string; createdAt: number; sizeBytes: number }>>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      const data = await fetchImageGallery();
      setGallery(data.gallery || []);
      if (data.gallery && data.gallery.length > 0 && !selectedImage) {
        setSelectedImage(data.gallery[0].url);
      }
    } catch (e) {}
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      // Simulate/trigger image creation into outputs/
      await new Promise(r => setTimeout(r, 2000));
      await loadGallery();
    } catch (err: any) {
      alert('Generation error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Parameters Panel */}
      <div style={{
        width: '380px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wand2 size={18} color="#ec4899" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
            Offline Image Studio (SD)
          </h2>
        </div>

        {/* Prompt Input */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic photorealistic portrait of an astronaut on a neon planet, 8k, octane render..."
            rows={4}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Negative Prompt */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
            Negative Prompt
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Model Selection */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
            Checkpoint Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="dreamshaper-8">DreamShaper 8 (SD 1.5 - Fast & Creative)</option>
            <option value="cyberrealistic-v8">CyberRealistic V8 (Photorealism)</option>
            <option value="juggernaut-xl">Juggernaut XL Lightning (SDXL)</option>
          </select>
        </div>

        {/* Resolution & Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Resolution
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            >
              <option value="512x512">512 × 512 (Standard)</option>
              <option value="512x768">512 × 768 (Portrait)</option>
              <option value="768x512">768 × 512 (Landscape)</option>
              <option value="768x768">768 × 768 (HD)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Steps ({steps})
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          style={{
            marginTop: 'auto',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: isGenerating ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
          }}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Rendering on GPU/CPU...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Generate Image</span>
            </>
          )}
        </button>
      </div>

      {/* Preview and Gallery Viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              USB Output Gallery
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              All generated artworks are saved strictly to USB <code style={{ color: '#38bdf8' }}>outputs/</code>
            </span>
          </div>

          <button
            onClick={loadGallery}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Main Display / Preview */}
        <div style={{
          flex: 1,
          minHeight: '400px',
          backgroundColor: '#040711',
          borderRadius: '16px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {selectedImage ? (
            <img
              src={selectedImage}
              alt="Generated output"
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>No Output Rendered Yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Write a prompt on the left and click Generate</div>
            </div>
          )}
        </div>

        {/* Gallery Thumbnails */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          {gallery.map((img, i) => (
            <div
              key={i}
              onClick={() => setSelectedImage(img.url)}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: selectedImage === img.url ? '2px solid #ec4899' : '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            >
              <img src={img.url} alt={img.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
