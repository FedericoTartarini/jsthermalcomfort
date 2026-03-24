(function() {
  let searchIndex = null;
  let searchData = [];
  const modal = document.getElementById('pst-search-modal');
  const overlay = document.getElementById('pst-search-overlay');
  const searchInputModal = document.getElementById('pst-search-input');
  const resultsContainerModal = document.getElementById('pst-search-results');
  const searchButtons = document.querySelectorAll('.search-button');

  const searchInputPage = document.getElementById('search-input-page');
  const resultsContainerPage = document.getElementById('search-results-page');
  const searchStatusPage = document.getElementById('search-status');

  // Load search data
  async function loadSearchData() {
    try {
      // Determine pathToRoot
      const currentPath = window.location.pathname;
      let pathToRoot = './';
      if (currentPath.includes('/documentation/')) {
        pathToRoot = '../';
      }
      
      const response = await fetch(pathToRoot + 'search-data.json');
      searchData = await response.json();
      
      // Initialize Lunr
      searchIndex = lunr(function () {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('content');

        searchData.forEach((doc, idx) => {
          this.add({
            id: idx,
            title: doc.title,
            content: doc.content
          });
        });
      });
      
      console.log('Search index loaded');
      
      // If we are on the search page, trigger initial search if query param exists
      if (searchInputPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
          searchInputPage.value = query;
          performSearch(query, resultsContainerPage, searchStatusPage, true);
        }
      }
    } catch (err) {
      console.error('Failed to load search data:', err);
    }
  }

  function performSearch(query, container, statusElem, isFullPage = false) {
    if (!searchIndex || !query || query.length < 2) {
      container.innerHTML = isFullPage ? '<p class="text-secondary text-center py-5">Please enter at least 2 characters.</p>' : '<div class="pst-search-placeholder">Start typing to search ...</div>';
      if (statusElem) statusElem.innerText = '';
      return;
    }

    const results = searchIndex.search(query);
    displayResults(results, container, statusElem, isFullPage);
  }

  function displayResults(results, container, statusElem, isFullPage) {
    container.innerHTML = '';
    
    if (results.length === 0) {
      container.innerHTML = isFullPage ? '<p class="text-secondary text-center py-5">No results found matching your query.</p>' : '<div class="pst-search-placeholder">No results found</div>';
      if (statusElem) statusElem.innerText = 'Found 0 results.';
      return;
    }

    if (statusElem) {
      statusElem.innerText = `Found ${results.length} result(s).`;
    }

    // Determine pathToRoot for links
    const currentPath = window.location.pathname;
    let pathToRoot = './';
    if (currentPath.includes('/documentation/')) {
      pathToRoot = '../';
    }

    results.forEach(result => {
      const doc = searchData[result.ref];
      const item = document.createElement(isFullPage ? 'div' : 'a');
      
      if (!isFullPage) {
        item.href = pathToRoot + doc.url;
        item.className = 'pst-search-result-item';
        item.innerHTML = `
          <span class="pst-search-result-title">${doc.title}</span>
          <span class="pst-search-result-snippet">${doc.content.substring(0, 150)}...</span>
        `;
      } else {
        item.className = 'search-result-page-item';
        item.innerHTML = `
          <h3><a href="${pathToRoot + doc.url}" class="text-decoration-none">${doc.title}</a></h3>
          <p class="search-result-page-snippet">${doc.content.substring(0, 300)}...</p>
          <hr class="mt-4 border-light opacity-10">
        `;
      }
      container.appendChild(item);
    });
  }

  // Modal handlers
  function openModal() {
    modal.style.display = 'block';
    overlay.style.display = 'block';
    searchInputModal.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.style.display = 'none';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Event Listeners
  searchButtons.forEach(btn => btn.addEventListener('click', openModal));
  overlay.addEventListener('click', closeModal);
  
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openModal();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  searchInputModal.addEventListener('input', (e) => {
    performSearch(e.target.value, resultsContainerModal);
  });

  if (searchInputPage) {
    searchInputPage.addEventListener('input', (e) => {
      performSearch(e.target.value, resultsContainerPage, searchStatusPage, true);
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.set('q', e.target.value);
      window.history.replaceState({}, '', url);
    });
  }

  // Init
  loadSearchData();
})();
