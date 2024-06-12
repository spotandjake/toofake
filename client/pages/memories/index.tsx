import styles from './memories.module.scss';
import l from '@/styles/loader.module.scss';
import React, { useState, useEffect, useRef } from 'react';
// TODO: We only want to import this in the main page, to keep a central api
import useCheck from '@/utils/check';
import TooFake, { type Memory } from '@/tooFake';
import MemoryCard from '@/components/memory/memory';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

export default function Memories() {
  // State
  const [memories, setMemories] = useState<Memory[] | string>('Loading');
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<{ type: "error" | "status" | "empty", msg: string}>({ type: "empty", msg: ""});
  const [downloadLoaderLength, setDownloadLoaderLength] = useState<number>(0);

  const primaryRef = useRef<HTMLInputElement | null>(null);
  const secondaryRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useRef<HTMLInputElement | null>(null);
  const downloadButtonRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // TODO: Make this a prop
  useCheck();
  const tooFake = new TooFake();
  // Fetch Memories
  useEffect(() => {
    (async () => {
      const memories = await tooFake.getMemories();
      setMemories(memories);
    })();
  }, []);
  // Download Memories
  const showDownloads = () => {
    setDownloadLoaderLength(0);
    setDownloadModalOpen(!downloadModalOpen);
  }
  const downloadMemories = async () => {
    // Get Elements
    const primary = primaryRef.current != null ? primaryRef.current.checked : false;
    const secondary = primaryRef.current != null ? primaryRef.current.checked : false;
    const merged = primaryRef.current != null ? primaryRef.current.checked : false;
    if (downloadButtonRef.current == null) {
      setDownloadStatus({ type: "error", msg: "Couldn't get download button [This Should Be Impossible]." });
      return;
    }
    const downloadButton = downloadButtonRef.current;
    if (canvasRef.current == null) {
      setDownloadStatus({ type: "error", msg: "Couldn't get canvas [This Should Be Impossible]." });
      return;
    }
    const canvas = canvasRef.current;
    // Make sure you can't click the button while downloading
    downloadButton.disabled = true;
    setDownloadLoaderLength(0);
    setDownloadStatus({ type: "status", msg: "Downloading..." })
    // Create Our Zip Achieve
    const zip = new JSZip();
    if (!primary && !secondary && !merged) {
      setDownloadStatus({ type: "error", msg: "No export option selected." });
      return;
    }
    // Ensure we have fetched memories
    if (typeof memories == 'string') {
      setDownloadStatus({ type: "error", msg: "Unexpected No Memories Loaded [This Should Be Impossible]." });
      return;
    }
    // Loop Through Memories
    for (let i = 0; i < memories.length; i++) {
      console.log("Downloading");
      // Get Current Memory
      const memory = memories[i];
      // Calculate Current Step
      setDownloadLoaderLength(Math.round(i / memories.length));
      setDownloadStatus({type:"status", msg: `${i} steps of ${memories.length}, ${Math.round(i / memories.length)}% complete`});
      // Get Memory Date
      let memoryDate = memory.memoryDay;
      // Generate Folder Name
      let monthString = `${memoryDate.getFullYear()}-${memoryDate.toLocaleDateString(
        'en-GB',
        { month: '2-digit' }
      )}, ${memoryDate.toLocaleString('en-us', {
        month: 'long',
        year: 'numeric',
      })}`;
      monthString = monthString.replaceAll('/', '-'); // Slashes aren't allowed for filenames
      // Generate File Date Format
      let dateString = memoryDate.toLocaleString('en-us', { dateStyle: 'long' });
      // An error can happen here, InvalidStateException
      // Caused by the primary/secondary image fetch being corrupt,
      // but only happens rarely on specific memories
      try {
        // REPLACE WITH PROPER PROXY SETUP!
        // Fetch image data
        const primary = await fetch(
          'https://toofake-cors-proxy-4fefd1186131.herokuapp.com/' +
            memory.primary.url
        ).then((result) => result.blob());
        const secondary = await fetch(
          'https://toofake-cors-proxy-4fefd1186131.herokuapp.com/' +
            memory.secondary.url
        ).then((result) => result.blob());
        // Create zip w/ image, adapted from https://stackoverflow.com/a/49836948/21809626
        // Zip (primary + secondary separate)
        if (primary) zip.file(`${monthString}/${dateString} - primary.png`, primary);
        if (secondary) zip.file(`${monthString}/${dateString} - secondary.png`, secondary);
        // Merging images for combined view
        // (Must have canvas declaration here to be accessed by toBlob())
        if (merged) {
          const primaryImage = await createImageBitmap(primary);
          const secondaryImage = await createImageBitmap(secondary);
          canvas.width = primaryImage.width;
          canvas.height = primaryImage.height;
          const ctx = canvas.getContext('2d');
          // Check if ctx is null for dealing with TS error (not necessary)
          // Bereal-style combined image
          // NOTE: secondary image is bugged for custom-uploaded images through the site,
          // that aren't phone-sized
          if (ctx) {
            ctx.drawImage(primaryImage, 0, 0);
            // Rounded secondary image, adapted from https://stackoverflow.com/a/19593950/21809626
            // Values relative to image size
            let width = secondaryImage.width * 0.3;
            let height = secondaryImage.height * 0.3;
            let x = primaryImage.width * 0.03;
            let y = primaryImage.height * 0.03;
            let radius = 70;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(
              x + width,
              y + height,
              x + width - radius,
              y + height
            );
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.lineWidth = 20;
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(secondaryImage, x, y, width, height);
          }
        }
        // Save as zip
        // Async stuff: Must have generateAsync in toBlob function to run in proper order
        canvas.toBlob(async (blob) => {
          if (blob) zip.file(`${monthString}/${dateString}.png`, blob);
        });
      } catch (e) {
        console.log(
          `ERROR: Memory #${i} on ${memoryDate} could not be zipped:\n${e}`
        );
        setDownloadStatus({type: "error", msg: `ERROR: Memory #${i} on ${memoryDate} could not be zipped`})
        continue;
      }
    }
    console.log("After");
    // Set Status To Downloading
    setDownloadLoaderLength(100);
    setDownloadStatus({type: "status", msg: "Downloading File" });
    // Download
    setTimeout(() => {
      zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
        FileSaver.saveAs(
          content,
          `bereal-export-${new Date()
            .toLocaleString('en-us', {
              year: '2-digit',
              month: '2-digit',
              day: '2-digit',
            })
            .replace(/\//g, '-')}.zip`
        );
      });
      // Set Status To Done
      setDownloadStatus({type: "status", msg: "Download Complete" });
      downloadButton.disabled = false;
    }, 1000);
  }
  // Render Page
  switch (typeof memories) {
    case 'string':
      // TODO: Improve Loader / Break into Separate Component
      return (
        <div className={styles.mem}>
          <div className={l.loader}></div>
        </div>
      );
    default:
      // Build Memories Layout
      const sections: { [key: string]: JSX.Element[] } = {};
      for (const memory of memories) {
        // Get Current Month
        const memoryMonth = memory.memoryDay.toLocaleDateString(
          undefined,
          {month:'long'}
        );
        // Check if a section for this month
        if (!Object.hasOwn(sections, memoryMonth)) sections[memoryMonth] = [];
        // Write the memory
        sections[memoryMonth].push(<MemoryCard memory={memory} key={memory.id} />);
      }
      // Convert Sections into a layout
      const layout: JSX.Element[] = [];
      for (const [ month, memories ] of Object.entries(sections)) {
        layout.push(<section>
          <h2>{month}</h2>
          <div>
            {memories}
          </div>
        </section>);
      }
      // Component
      return (
        <div className={styles.container}>
          <div className={styles.memories}>
            {layout}
          </div>
          <button className={[styles.export, styles.button].join(' ')} onClick={showDownloads}>Export</button>
          {downloadModalOpen ? <dialog className={styles.downloadDialog} open onClick={() => setDownloadModalOpen(false)}>
            <div onClick={(evt) => evt.stopPropagation()}>
              <canvas ref={canvasRef}></canvas>
              <h2>Export</h2>
              <span>
                <label htmlFor='primaryExport'>Export Primary Images: </label>
                <input type="checkbox" id="primaryExport" name="primaryExport" ref={primaryRef} />
              </span>
              <span>
                <label htmlFor='secondaryExport'>Export Secondary Images: </label>
                <input type="checkbox" id="secondaryExport" name="secondaryExport" ref={secondaryRef} />
              </span>
              <span>
                <label htmlFor='mergedExport'>Export Merged Primary + Secondary in one Image: </label>
                <input type="checkbox" id="mergedExport" name="mergedExport" ref={mergedRef} />
              </span>
              <div className={styles.outerBar}>
                <span className={styles.innerBar} style={{width: `${downloadLoaderLength}%`}}></span>
              </div>
              <span>{downloadStatus.msg}</span>
              <button className={styles.button} onClick={downloadMemories} ref={downloadButtonRef}>Start Export</button>
            </div>
          </dialog> : <></>}
        </div>
      );
  }
}
