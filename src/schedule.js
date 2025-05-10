    function toggleSchedule() {
      const table = document.getElementById('scheduleTable');
      const arrow = document.getElementById('arrow');
      const scroll = document.getElementById('scrollingText');

      if (table.style.display === 'none' || table.style.display === '') {
        table.style.display = 'table';
        arrow.classList.add('open');
        scroll.classList.add('hidden');
      } else {
        table.style.display = 'none';
        arrow.classList.remove('open');
        scroll.classList.remove('hidden');
      }
    }