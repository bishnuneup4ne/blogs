'use client';

import { ZoomableImage } from '@/components/blog/ZoomableImage';
import styles from '@/styles/page-shell.module.scss';

export default function SamplePage() {
  return (
    <div className={styles.pageShell} style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
        Image Styling Sample
      </h1>

      <p style={{ fontSize: '16px', marginBottom: '32px', lineHeight: '1.6' }}>
        Click on any image below to zoom in. Try the dark theme toggle to see the styling in action.
      </p>

      {/* Sample 1: Wide image */}
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '32px', marginBottom: '16px' }}>
        Wide Image Example
      </h2>
      <ZoomableImage
        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop"
        alt="Mountain landscape"
        marginBottom="32"
      />

      {/* Sample 2: Portrait image */}
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '32px', marginBottom: '16px' }}>
        Portrait Image Example
      </h2>
      <ZoomableImage
        src="https://images.unsplash.com/photo-1509391366360-2e938aa1ef14?w=400&h=600&fit=crop"
        alt="Portrait photo"
        marginBottom="32"
      />

      {/* Sample 3: Square image */}
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '32px', marginBottom: '16px' }}>
        Square Image Example
      </h2>
      <ZoomableImage
        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=600&fit=crop"
        alt="Tech workspace"
        marginBottom="32"
      />

      {/* Sample 4: PNG with transparency */}
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '32px', marginBottom: '16px' }}>
        PNG with Transparency (white background shows)
      </h2>
      <ZoomableImage
        src="https://www.freepnglogos.com/uploads/logo-png/logo-png-transparent-images-31.png"
        alt="Transparent PNG logo"
        marginBottom="32"
      />

      <p style={{ fontSize: '16px', marginTop: '32px', lineHeight: '1.6' }}>
        💡 <strong>Tip:</strong> Visit Admin → Image Styling to customize all these images' appearance!
      </p>
    </div>
  );
}
