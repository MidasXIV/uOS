import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execAsync = promisify(exec);

export class ScreenshotUtils {
  public static async captureScreenshot(outputPath: string): Promise<void> {
    const preOptimizedFilePath = outputPath.replace('.png', '-post.png');
    try {
      // For Windows, we'll use the built-in Snipping Tool
      await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms;[System.Windows.Forms.SendKeys]::SendWait('{PRTSC}');"`);

      // Wait a moment for the screenshot to be taken
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });

      // Save the screenshot from clipboard
      await execAsync(`powershell -command "$image = Get-Clipboard -Format Image; $image.Save('${outputPath}');"`);

      // Optimize the screenshot by converting to grayscale and resizing
      // No need to optimize always uses 2800 tokens
      // await sharp(outputPath)
      //   .grayscale() // Convert to grayscale
      //   .resize({ fit: 'contain', height: 1200, width: 1920 }) // Resize while maintaining aspect ratio and prevent wrapping
      //   .toFormat('png', { compressionLevel: 8 }) // Optimize PNG compression
      //   .toFile(preOptimizedFilePath); // Save as optimized PNG

    } catch (error) {
      throw new Error(`Failed to capture screenshot: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  public static async createImageCollage(imagePaths: string[], outputPath: string): Promise<void> {
    try {
      // Calculate grid dimensions
      const numImages = imagePaths.length;
      const gridSize = Math.ceil(Math.sqrt(numImages));

      // Calculate individual image dimensions
      const individualWidth = 1024;
      const individualHeight = 768;

      // Create a new image with white background
      const collage = sharp({
        create: {
          background: { alpha: 1, b: 255, g: 255, r: 255 },
          channels: 4,
          height: gridSize * individualHeight,
          width: gridSize * individualWidth
        }
      });

      // Resize images to fit the grid cell dimensions
      const resizedImages = await Promise.all(imagePaths.map(async (imagePath) => {
        const resizedBuffer = await sharp(imagePath)
          .resize(individualWidth, individualHeight, { fit: 'cover' })
          .toBuffer();
        return { input: resizedBuffer };
      }));

      // Prepare composite operations with resized images
      const composites = resizedImages.map((resizedImage, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;

        return {
          ...resizedImage,
          left: col * individualWidth,
          top: row * individualHeight
        };
      });

      // Create the collage
      await collage
        .composite(composites)
        .toFile(outputPath);

    } catch (error) {
      throw new Error(`Failed to create collage: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }
}
