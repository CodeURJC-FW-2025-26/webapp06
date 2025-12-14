// public/ui.js
// UI helpers (modales + borrado marca AJAX + drag&drop/preview imagen)
// Diseñado para NO interferir con app.js (validación / AJAX de A).

(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // ---------- Modal genérico de error ----------
  function showErrorModal(title, messages) {
    var modalEl = document.getElementById('genericErrorModal');
    if (!modalEl || typeof bootstrap === 'undefined') {
      // Fallback: si por lo que sea no existe modal/bootstrap
      alert((title ? title + "\n\n" : "") + (Array.isArray(messages) ? messages.join("\n") : messages));
      return;
    }

    var titleEl = modalEl.querySelector('.modal-title');
    var bodyEl = modalEl.querySelector('.modal-body');

    titleEl.textContent = title || 'Error';

    var msgs = messages;
    if (!msgs) msgs = ['Ha ocurrido un error.'];
    if (typeof msgs === 'string') msgs = msgs.split('\n').filter(Boolean);

    // Render list
    bodyEl.innerHTML = '';
    var ul = document.createElement('ul');
    ul.className = 'mb-0';
    msgs.forEach(function (m) {
      var li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    });
    bodyEl.appendChild(ul);

    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  // ---------- Modal de confirmación ----------
  function confirmAction(opts, onConfirm) {
    var modalEl = document.getElementById('confirmActionModal');
    if (!modalEl || typeof bootstrap === 'undefined') {
      var ok = window.confirm((opts && opts.body) || '¿Confirmas la acción?');
      onConfirm(!!ok);
      return;
    }

    var titleEl = modalEl.querySelector('.modal-title');
    var bodyEl = modalEl.querySelector('.modal-body');
    var btnConfirm = modalEl.querySelector('.js-confirm');

    titleEl.textContent = (opts && opts.title) || 'Confirmar acción';
    bodyEl.textContent = (opts && opts.body) || '¿Confirmas la acción?';
    btnConfirm.textContent = (opts && opts.confirmText) || 'Sí, continuar';

    // Evitar acumular listeners
    var newBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

    newBtn.addEventListener('click', function () {
      var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();
      onConfirm(true);
    });

    // Cancelar / cerrar => false
    modalEl.addEventListener('hidden.bs.modal', function handler() {
      modalEl.removeEventListener('hidden.bs.modal', handler);
      onConfirm(false);
    });

    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  // ---------- Borrado Marca (Entidad principal) por AJAX ----------
  function initDeleteBrandAjax() {
    var form = qs('form.js-delete-brand');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      confirmAction(
        {
          title: 'Confirmar acción',
          body: '¿Seguro que quieres borrar esta marca? Esta acción no se puede deshacer.',
          confirmText: 'Sí, borrar'
        },
        function (confirmed) {
          if (!confirmed) return;

          fetch(form.action, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          })
            .then(function (r) {
              return r.json().catch(function () {
                // Si el servidor no devuelve JSON, lo tratamos como error
                throw new Error('Respuesta inesperada del servidor.');
              }).then(function (data) {
                if (!r.ok || !data || data.success !== true) {
                  var msg = (data && (data.message || data.error)) || 'No se pudo borrar la marca.';
                  throw new Error(msg);
                }
                // Redirect
                window.location.href = data.redirectUrl || '/index';
              });
            })
            .catch(function (err) {
              showErrorModal('Error al borrar', err && err.message ? err.message : 'Error inesperado.');
            });
        }
      );
    });
  }
  
// ---------- Borrado Modelo (Entidad secundaria) por AJAX + confirmación ----------
function initDeleteModelAjax() {
  var forms = document.querySelectorAll('form.js-delete-model');
  if (!forms || !forms.length) return;

  for (var i = 0; i < forms.length; i++) {
    (function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        confirmAction(
          {
            title: 'Confirmar acción',
            body: '¿Seguro que quieres borrar este modelo? Esta acción no se puede deshacer.',
            confirmText: 'Sí, borrar'
          },
          function (confirmed) {
            if (!confirmed) return;

            fetch(form.action, {
              method: 'POST',
              headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
              .then(function (r) {
                return r.json().catch(function () {
                  throw new Error('Respuesta inesperada del servidor.');
                }).then(function (data) {
                  if (!r.ok || !data || data.success !== true) {
                    var msg = (data && (data.message || data.error)) || 'No se pudo borrar el modelo.';
                    throw new Error(msg);
                  }

                  // Eliminar la tarjeta del DOM sin recargar
                  try {
                    var cardCol = form.closest('.col-12');
                    if (!cardCol) {
                      // try by column classes
                      cardCol = form.closest('.col-md-6') || form.closest('.col-6');
                    }
                    if (cardCol && cardCol.parentNode) {
                      cardCol.parentNode.removeChild(cardCol);
                      return;
                    }
                  } catch (e) {
                    // ignore and fallback
                  }

                  // Fallback: redirect a la página de marca si viene en la respuesta
                  if (data.brandId) {
                    window.location.href = '/brand/' + data.brandId;
                  } else {
                    window.location.reload();
                  }
                });
              })
              .catch(function (err) {
                showErrorModal('Error al borrar modelo', err && err.message ? err.message : 'Error inesperado.');
              });
          }
        );
      });
    })(forms[i]);
  }
}

  // ---------- Imágenes: preview + drag&drop + quitar ----------
  function initBrandImageUX() {
    var input = document.getElementById('logo'); // en new.html es id="logo"
    if (!input) return;

    var drop = document.getElementById('brandImageDropzone');
    var preview = document.getElementById('brandImagePreview');
    var btnClear = document.getElementById('btnRemoveSelectedImage');

    function clearImage() {
      input.value = '';
      if (preview) {
        preview.src = '';
        preview.classList.add('d-none');
      }
    }

    function setPreviewFromFile(file) {
      if (!file || !preview) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        preview.src = ev.target.result;
        preview.classList.remove('d-none');
      };
      reader.readAsDataURL(file);
    }

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (file) setPreviewFromFile(file);
    });

    if (btnClear) {
      btnClear.addEventListener('click', function (e) {
        e.preventDefault();
        clearImage();
      });
    }

    if (drop) {
      // Click en dropzone abre el selector
      drop.addEventListener('click', function () { input.click(); });

      ['dragenter', 'dragover'].forEach(function (evName) {
        drop.addEventListener(evName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          drop.classList.add('border-primary');
        });
      });

      ['dragleave', 'drop'].forEach(function (evName) {
        drop.addEventListener(evName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          drop.classList.remove('border-primary');
        });
      });

      drop.addEventListener('drop', function (e) {
        var dt = e.dataTransfer;
        if (!dt || !dt.files || !dt.files.length) return;

        var file = dt.files[0];
        // Asignar al input (DataTransfer)
        try {
          var transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
        } catch (_) {
          // Si el navegador no lo soporta, al menos preview
        }
        setPreviewFromFile(file);
      });
    }
  }

// ---------- Imágenes Modelo: preview + drag&drop + quitar ----------
function initModelImageUX() {
  var input = document.getElementById('coverImage'); // en edit_model.html
  if (!input) return;

  var drop = document.getElementById('modelImageDropzone');
  var preview = document.getElementById('modelImagePreview');
  var btnClear = document.getElementById('btnRemoveSelectedModelImage');

  function clearImage() {
    input.value = '';
    if (preview) {
      preview.src = '';
      preview.classList.add('d-none');
    }
  }

  function setPreviewFromFile(file) {
    if (!file || !preview) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      preview.src = ev.target.result;
      preview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change', function () {
    var file = input.files && input.files[0];
    if (file) setPreviewFromFile(file);
  });

  if (btnClear) {
    btnClear.addEventListener('click', function (e) {
      e.preventDefault();
      clearImage();
    });
  }

  if (drop) {
    drop.addEventListener('click', function () { input.click(); });

    ['dragenter', 'dragover'].forEach(function (evName) {
      drop.addEventListener(evName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.add('border-primary');
      });
    });

    ['dragleave', 'drop'].forEach(function (evName) {
      drop.addEventListener(evName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.remove('border-primary');
      });
    });

    drop.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;

      var file = dt.files[0];
      try {
        var transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
      } catch (_) {
        // ignore
      }
      setPreviewFromFile(file);
    });
  }
}


  document.addEventListener('DOMContentLoaded', function () {
  initDeleteBrandAjax();
  initDeleteModelAjax();
  initBrandImageUX();
  initModelImageUX();
});

  // Exponer por si A/B quieren reutilizar
  window.UIHelpers = {
    showErrorModal: showErrorModal,
    confirmAction: confirmAction
  };
  // Exponer inicializadores para que otras partes puedan reusarlos
  window.UIHelpers.initDeleteModelAjax = initDeleteModelAjax;
  window.UIHelpers.initDeleteBrandAjax = initDeleteBrandAjax;
})();
