import pptxgen from 'pptxgenjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';

export interface SlideData {
  title: string;
  bullets?: string[];
  notes?: string;
}

export interface PresentationOptions {
  title: string;
  subtitle?: string;
  slides: SlideData[];
  theme?: 'modern' | 'corporate' | 'vibrant' | 'minimal';
}

const THEMES = {
  modern: {
    titleBg: '1E1B4B',
    titleColor: 'FFFFFF',
    subtitleColor: 'A5B4FC',
    slideBg: 'F8FAFC',
    headerColor: '1E1B4B',
    bulletColor: '334155',
    accentColor: '4F46E5',
  },
  corporate: {
    titleBg: '0F172A',
    titleColor: 'FFFFFF',
    subtitleColor: '94A3B8',
    slideBg: 'FFFFFF',
    headerColor: '0F172A',
    bulletColor: '334155',
    accentColor: '2563EB',
  },
  vibrant: {
    titleBg: '581C87',
    titleColor: 'FFFFFF',
    subtitleColor: 'F0ABFC',
    slideBg: 'FAF5FF',
    headerColor: '581C87',
    bulletColor: '3B0764',
    accentColor: 'D946EF',
  },
  minimal: {
    titleBg: '18181B',
    titleColor: 'FFFFFF',
    subtitleColor: 'A1A1AA',
    slideBg: 'FAFAFA',
    headerColor: '18181B',
    bulletColor: '27272A',
    accentColor: '059669',
  },
};

export async function generatePresentation(options: PresentationOptions): Promise<{ success: boolean; filePath: string; message: string }> {
  try {
    const pptx = new pptxgen();
    const themeKey = options.theme && THEMES[options.theme] ? options.theme : 'modern';
    const palette = THEMES[themeKey];

    pptx.layout = 'LAYOUT_16x9';

    // 1. Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: palette.titleBg };

    titleSlide.addText(options.title, {
      x: 0.8,
      y: 2.2,
      w: 8.4,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: palette.titleColor,
      align: 'left',
      fontFace: 'Arial',
    });

    if (options.subtitle) {
      titleSlide.addText(options.subtitle, {
        x: 0.8,
        y: 3.8,
        w: 8.4,
        h: 1.0,
        fontSize: 20,
        color: palette.subtitleColor,
        align: 'left',
        fontFace: 'Arial',
      });
    }

    // Branded footer line on title slide
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 5.0,
      w: 2.5,
      h: 0.08,
      fill: { color: palette.accentColor },
    });

    // 2. Content Slides
    for (const item of options.slides) {
      const slide = pptx.addSlide();
      slide.background = { color: palette.slideBg };

      // Top Accent Line
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8,
        y: 0.5,
        w: 0.6,
        h: 0.06,
        fill: { color: palette.accentColor },
      });

      // Slide Title
      slide.addText(item.title, {
        x: 0.8,
        y: 0.7,
        w: 8.4,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: palette.headerColor,
        fontFace: 'Arial',
      });

      // Bullets
      if (item.bullets && item.bullets.length > 0) {
        const bulletObjects = item.bullets.map((b) => ({
          text: b,
          options: {
            fontSize: 16,
            color: palette.bulletColor,
            bullet: { code: '2022' },
            spaceAfter: 12,
            fontFace: 'Arial',
          },
        }));

        slide.addText(bulletObjects, {
          x: 0.8,
          y: 1.7,
          w: 8.4,
          h: 4.5,
          valign: 'top',
        });
      }

      // Speaker Notes
      if (item.notes) {
        slide.addNotes(item.notes);
      }
    }

    // 3. Closing Slide
    const closingSlide = pptx.addSlide();
    closingSlide.background = { color: palette.titleBg };
    closingSlide.addText('Thank You', {
      x: 1.0,
      y: 2.5,
      w: 8.0,
      h: 1.2,
      fontSize: 40,
      bold: true,
      color: palette.titleColor,
      align: 'center',
      fontFace: 'Arial',
    });

    // Ensure output directory exists
    const docsDir = path.join(os.homedir(), 'Documents', 'Shashwat Presentations');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const sanitizedTitle = options.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().substring(0, 30);
    const fileName = `${sanitizedTitle || 'Presentation'}_${Date.now()}.pptx`;
    const filePath = path.join(docsDir, fileName);

    await pptx.writeFile({ fileName: filePath });
    console.log(`[PresentationGenerator] Saved PPTX file to: ${filePath}`);

    // Auto-open in Windows default application (Microsoft PowerPoint)
    exec(`start "" "${filePath}"`, (err) => {
      if (err) console.warn('[PresentationGenerator] Open file notice:', err.message);
    });

    return {
      success: true,
      filePath,
      message: `Presentation generated successfully and opened in PowerPoint: ${fileName}`,
    };
  } catch (error: any) {
    console.error('[PresentationGenerator] Error:', error);
    return {
      success: false,
      filePath: '',
      message: `Failed to generate presentation: ${error?.message || 'Unknown error'}`,
    };
  }
}
