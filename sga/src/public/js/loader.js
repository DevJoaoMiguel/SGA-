// Função para mostrar o loader
function showLoader() {
    document.getElementById('loader-container').classList.add('show');
}

// Função para esconder o loader
function hideLoader() {
    document.getElementById('loader-container').classList.remove('show');
}

// Intercepta todas as requisições fetch para mostrar/esconder o loader automaticamente
const originalFetch = window.fetch;
window.fetch = function() {
    showLoader();
    return originalFetch.apply(this, arguments)
        .then((response) => {
            hideLoader();
            return response;
        })
        .catch((error) => {
            hideLoader();
            throw error;
        });
}; 