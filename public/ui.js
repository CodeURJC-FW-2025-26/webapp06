// public/ui.js
// UI helpers (modals + AJAX brand deletion + drag&drop/image preview)
// Designed to NOT interfere with app.js (validation / other AJAX).

(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // ---------- Generic error modal ----------
  function showErrorModal(title, messages) {
    var modalEl = document.getElementById('genericErrorModal');
    if (!modalEl || typeof bootstrap === 'undefined') {
      // Fallback: if modal/bootstrap is not available for any reason
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

  // ---------- Confirmation modal ----------
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

    // Avoid accumulating listeners
    var newBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

    newBtn.addEventListener('click', function () {
      var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();
      onConfirm(true);
    });

    // Cancel/close => false
    modalEl.addEventListener('hidden.bs.modal', function handler() {
      modalEl.removeEventListener('hidden.bs.modal', handler);
      onConfirm(false);
    });

    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  // Simple POST helper using XMLHttpRequest (callback style)
  function postAjax(url, cbSuccess, cbError) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if ('withCredentials' in xhr) xhr.withCredentials = true;
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        var data = null;
        var ct = (xhr.getResponseHeader && xhr.getResponseHeader('Content-Type')) || '';
        if (ct.indexOf('application/json') !== -1 && xhr.responseText) {
          data = JSON.parse(xhr.responseText);
        }
        if (cbSuccess) cbSuccess(data, xhr);
      } else {
        var msg = 'Error en la petición (' + xhr.status + ')';
        var ct2 = (xhr.getResponseHeader && xhr.getResponseHeader('Content-Type')) || '';
        if (ct2.indexOf('application/json') !== -1 && xhr.responseText) {
          var d = JSON.parse(xhr.responseText);
          msg = (d && (d.message || d.error)) || msg;
        }
        if (cbError) cbError(new Error(msg));
      }
    };
    xhr.onerror = function () { if (cbError) cbError(new Error('Error de red.')); };
    xhr.send();
  }

  // ---------- Delete Brand (main entity) via AJAX ----------
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

          postAjax(form.action, function (data) {
            if (!data || data.success !== true) {
              var msg = (data && (data.message || data.error)) || 'No se pudo borrar la marca.';
              showErrorModal('Error al borrar', msg);
              return;
            }
            // Redirect
            window.location.href = data.redirectUrl || '/index';
          }, function (err) {
            showErrorModal('Error al borrar', err && err.message ? err.message : 'Error inesperado.');
          });
        }
      );
    });
  }

  // ---------- Delete Model (secondary entity) via AJAX + confirmation ----------
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

              postAjax(form.action, function (data) {
                if (!data || data.success !== true) {
                  var msg = (data && (data.message || data.error)) || 'No se pudo borrar el modelo.';
                  showErrorModal('Error al borrar modelo', msg);
                  return;
                }

                // Remove the card from the DOM without reloading
                var cardCol = form.closest && form.closest('.col-12');
                if (!cardCol && form.closest) {
                  // try by column classes
                  cardCol = form.closest('.col-md-6') || form.closest('.col-6');
                }
                if (cardCol && cardCol.parentNode) {
                  cardCol.parentNode.removeChild(cardCol);
                  return;
                }

                // Fallback: redirect to the brand page if present in the response
                if (data.brandId) {
                  window.location.href = '/brand/' + data.brandId;
                } else {
                  window.location.reload();
                }
              }, function (err) {
                showErrorModal('Error al borrar modelo', err && err.message ? err.message : 'Error inesperado.');
              });
            }
          );
        });
      })(forms[i]);
    }
  }

  // ---------- Images: preview + drag&drop + remove ----------
  function initBrandImageUX() {
    var input = document.getElementById('logo'); // in new.html the id is "logo"
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
      // Click on dropzone opens the file selector
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
        // Assign to the input (DataTransfer) if supported
        if (typeof DataTransfer === 'function') {
          var transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
        }
        setPreviewFromFile(file);
      });
    }
  }

  // ---------- Model Images: preview + drag&drop + remove ----------
  function initModelImageUX() {
    var input = document.getElementById('coverImage'); // in edit_model.html
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
        if (typeof DataTransfer === 'function') {
          var transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
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

  // ---------- Image error fallback ----------
  document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG' && e.target.classList.contains('js-fallback-img')) {
      const wrapper = e.target.closest('.image-wrapper');
      if (wrapper) {
        e.target.remove();
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.textContent = 'Sin imagen';
        wrapper.appendChild(placeholder);
      }
    }
  }, true);

  // Expose in case A/B want to reuse
  window.UIHelpers = {
    showErrorModal: showErrorModal,
    confirmAction: confirmAction
  };
  // Expose initializers so other parts can reuse them
  window.UIHelpers.initDeleteModelAjax = initDeleteModelAjax;
  window.UIHelpers.initDeleteBrandAjax = initDeleteBrandAjax;
})();
