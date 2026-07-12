import './style.css'

const form = document.getElementById('publishForm') as HTMLFormElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
const publishBtn = document.getElementById('publishBtn') as HTMLButtonElement;
const publishText = document.getElementById('publishText') as HTMLSpanElement;
const publishSpinner = document.getElementById('publishSpinner') as HTMLElement;
const statusBox = document.getElementById('statusBox') as HTMLDivElement;

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
  const image = (document.getElementById('image') as HTMLInputElement).value;

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
