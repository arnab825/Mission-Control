import './style.css'

let currentVersion = '1.0.0';

function bumpVersion(current: string, part: 'patch' | 'minor' | 'major'): string {
  const parts = current.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return current;
  let [major, minor, patch] = parts;
  
  if (part === 'major') {
    return `${major + 1}.0.0`;
  } else if (part === 'minor') {
    if (minor >= 9) {
      return `${major + 1}.0.0`;
    }
    return `${major}.${minor + 1}.0`;
  } else if (part === 'patch') {
    if (patch >= 9) {
      if (minor >= 9) {
        return `${major + 1}.0.0`;
      }
      return `${major}.${minor + 1}.0`;
    }
    return `${major}.${minor}.${patch + 1}`;
  }
  return current;
}

async function initReleaseInfo() {
  try {
    // @ts-ignore
    const info = await window.electronAPI.getReleaseInfo();
    if (info && info.success) {
      currentVersion = info.currentVersion;
      
      const currentVersionBadge = document.getElementById('currentVersionBadge') as HTMLSpanElement;
      if (currentVersionBadge) {
        currentVersionBadge.textContent = `v${currentVersion}`;
      }
      
      updateTargetVersion();
      
      if (info.changelog && info.changelog.length > 0) {
        const latest = info.changelog[0];
        const prevVer = document.getElementById('prevVer') as HTMLSpanElement;
        const prevDate = document.getElementById('prevDate') as HTMLSpanElement;
        const prevTitle = document.getElementById('prevTitle') as HTMLHeadingElement;
        const prevHighlights = document.getElementById('prevHighlights') as HTMLUListElement;
        
        if (prevVer) prevVer.textContent = `v${latest.version}`;
        if (prevDate) prevDate.textContent = latest.date;
        if (prevTitle) prevTitle.textContent = latest.title;
        
        if (prevHighlights && latest.highlights) {
          prevHighlights.innerHTML = latest.highlights
            .map((h: string) => `<li>${h}</li>`)
            .join('');
        }
      }
    }
  } catch (err) {
    console.error("Failed to load release info", err);
  }
}

function updateTargetVersion() {
  const typeSelect = document.getElementById('type') as HTMLSelectElement;
  const targetVersionDisplay = document.getElementById('targetVersionDisplay') as HTMLSpanElement;
  if (typeSelect && targetVersionDisplay) {
    const selectedType = typeSelect.value as 'patch' | 'minor' | 'major';
    targetVersionDisplay.textContent = `v${bumpVersion(currentVersion, selectedType)}`;
  }
}

const typeSelect = document.getElementById('type') as HTMLSelectElement;
if (typeSelect) {
  typeSelect.addEventListener('change', updateTargetVersion);
}

initReleaseInfo();


const form = document.getElementById('publishForm') as HTMLFormElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
const publishBtn = document.getElementById('publishBtn') as HTMLButtonElement;
const publishText = document.getElementById('publishText') as HTMLSpanElement;
const publishSpinner = document.getElementById('publishSpinner') as HTMLElement;
const statusBox = document.getElementById('statusBox') as HTMLDivElement;
const fileInput = document.getElementById('imageFile') as HTMLInputElement;
const fileNameDisplay = document.getElementById('fileNameDisplay') as HTMLSpanElement;

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length > 0) {
    fileNameDisplay.textContent = fileInput.files[0].name;
    fileNameDisplay.classList.remove('hidden');
  } else {
    fileNameDisplay.classList.add('hidden');
  }
});

const autoGenTitleBtn = document.getElementById('autoGenTitleBtn') as HTMLButtonElement;
const autoGenChangesBtn = document.getElementById('autoGenChangesBtn') as HTMLButtonElement;
const titleInput = document.getElementById('title') as HTMLInputElement;
const changesInput = document.getElementById('changes') as HTMLTextAreaElement;

autoGenTitleBtn.addEventListener('click', async () => {
  autoGenTitleBtn.disabled = true;
  const originalText = autoGenTitleBtn.innerHTML;
  autoGenTitleBtn.innerHTML = 'Generating...';
  try {
    // @ts-ignore
    const data = await window.electronAPI.getGitReleaseData();
    titleInput.value = data.title;
  } catch (err) {
    console.error("Failed to auto-generate release title", err);
  } finally {
    autoGenTitleBtn.disabled = false;
    autoGenTitleBtn.innerHTML = originalText;
  }
});

autoGenChangesBtn.addEventListener('click', async () => {
  autoGenChangesBtn.disabled = true;
  const originalText = autoGenChangesBtn.innerHTML;
  autoGenChangesBtn.innerHTML = 'Generating...';
  try {
    // @ts-ignore
    const data = await window.electronAPI.getGitReleaseData();
    changesInput.value = data.changelog;
  } catch (err) {
    console.error("Failed to auto-generate changelog", err);
  } finally {
    autoGenChangesBtn.disabled = false;
    autoGenChangesBtn.innerHTML = originalText;
  }
});

function setStatus(message: string, isError: boolean = false) {
  statusBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-400', 'border-red-500/20', 'bg-green-500/10', 'text-green-400', 'border-green-500/20', 'bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
  
  if (isError) {
    statusBox.classList.add('bg-red-500/10', 'text-red-400', 'border', 'border-red-500/20');
  } else {
    statusBox.classList.add('bg-green-500/10', 'text-green-400', 'border', 'border-green-500/20');
  }
  
  statusBox.textContent = message;
}

function setLoading(isLoading: boolean) {
  if (isLoading) {
    publishBtn.disabled = true;
    publishText.textContent = "Publishing...";
    publishSpinner.classList.remove('hidden');
    statusBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-400', 'border-red-500/20', 'bg-green-500/10', 'text-green-400', 'border-green-500/20');
    statusBox.classList.add('bg-blue-500/10', 'text-blue-400', 'border', 'border-blue-500/20');
    statusBox.textContent = "Running publish script. This may take a moment...";
  } else {
    publishBtn.disabled = false;
    publishText.textContent = "Publish Now";
    publishSpinner.classList.add('hidden');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = (document.getElementById('title') as HTMLInputElement).value;
  const type = (document.getElementById('type') as HTMLSelectElement).value;
  const changesRaw = (document.getElementById('changes') as HTMLTextAreaElement).value;
  
  let image = '';
  if (fileInput.files && fileInput.files.length > 0) {
    // In Electron with Node Integration, File objects have a .path property
    image = (fileInput.files[0] as any).path;
  }

  const changes = changesRaw.split('\n').map(c => c.trim()).filter(c => c !== '');

  setLoading(true);

  try {
    // @ts-ignore
    const result = await window.electronAPI.publishRelease({
      title,
      type,
      changes,
      image
    });

    if (result.success) {
      setStatus("Success! Version published and pushed to GitHub.");
      // Optionally close the window after a delay
      setTimeout(() => window.close(), 3000);
    } else {
      setStatus(`Error: ${result.error || 'Failed to publish'}`, true);
      console.error(result.output);
    }
  } catch (err) {
    setStatus(`Exception: ${err}`, true);
  } finally {
    setLoading(false);
  }
});

cancelBtn.addEventListener('click', () => {
  window.close();
});
