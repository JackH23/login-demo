window.addEventListener('DOMContentLoaded', () => {
  const sections = Array.from(document.querySelectorAll('#weekend-sections .section'));
  let current = 0;
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  function show(idx){
    sections.forEach((sec,i)=>sec.classList.toggle('active', i===idx));
  }

  document.getElementById('nextBtn').addEventListener('click', () => {
    current = (current + 1) % sections.length;
    show(current);
  });
  document.getElementById('prevBtn').addEventListener('click', () => {
    current = (current - 1 + sections.length) % sections.length;
    show(current);
  });

  sections.forEach((section, index) => {
    const week = index + 1;
    const assetInput = section.querySelector(`input[name="asset${week}"]`);
    const inputs = [assetInput];
    days.forEach(day => {
      const spend = section.querySelector(`input[name="Weekend_${week}_${day}"]`);
      if (spend) inputs.push(spend);
    });
    inputs.forEach(inp => inp.addEventListener('input', () => calculate(section, week)));
  });

  function calculate(section, week){
    const assetVal = parseFloat(section.querySelector(`input[name="asset${week}"]`).value) || 0;
    let spentTotal = 0;
    let remaining = assetVal;
    days.forEach(day => {
      const spend = section.querySelector(`input[name="Weekend_${week}_${day}"]`);
      if (spend) {
        const val = parseFloat(spend.value) || 0;
        spentTotal += val;
        remaining = assetVal - spentTotal;
        const left = section.querySelector(`input[name="${day}_${week}_left"]`);
        if (left) left.value = remaining.toFixed(2);
        const res1 = section.querySelector(`input[name="${day}_${week}_result1"]`);
        if (res1) res1.value = spentTotal.toFixed(2);
        const res2 = section.querySelector(`input[name="${day}_${week}_result2"]`);
        if (res2) res2.value = spentTotal.toFixed(2);
      }
    });
    const wkRes = section.querySelector(`input[name="Weekend_${week}_result"]`);
    if (wkRes) wkRes.value = spentTotal.toFixed(2);
  }

  show(current);
});
