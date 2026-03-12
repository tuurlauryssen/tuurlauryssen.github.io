async function loadComponents() {
  const targets = Array.from(document.querySelectorAll('[data-component]'));

  for (const target of targets) {
    const name = target.dataset.component;
    if (!name) continue;

    try {
      const response = await fetch(`components/${name}.html`, {
        headers: { Accept: 'text/html' }
      });

      if (!response.ok) {
        throw new Error(`Failed to load component "${name}" (${response.status})`);
      }

      target.innerHTML = await response.text();
    } catch (error) {
      console.error(error);
      target.innerHTML = `<div style="padding:16px;color:#8b0000;font-family:sans-serif;">Component failed to load: ${name}</div>`;
    }
  }

  document.dispatchEvent(new CustomEvent('components:loaded'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadComponents, { once: true });
} else {
  loadComponents();
}
