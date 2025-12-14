/**
 * Form Validation with Bootstrap and AJAX
 * Handles real-time validation for brand and model forms
 * No Promises/async-await version
 */

document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form');

    for (var i = 0; i < forms.length; i++) {
        (function (form) {
            form.addEventListener('submit', function (e) {

                // ✅ Dejar que ui.js maneje los formularios de borrado con confirmación
                if (form.classList.contains('js-delete-brand') || form.classList.contains('js-delete-model')) {
                    return; // NO interceptar aquí
                }
                
                e.preventDefault();

                // Clear previous errors
                clearAllErrors(form);

                // Validate form
                validateForm(form, function (isValid) {
                    if (isValid) {
                        // Submit the form via AJAX with spinner
                        submitFormAjax(form);
                    }
                });
            });
        })(forms[i]);
    }

    // Add real-time validation listeners
    setupRealtimeValidation();
    // Inicializar edición inline de modelos
    if (typeof initInlineModelEdit === 'function') {
        initInlineModelEdit();
    }
});

function setupRealtimeValidation() {
    // Brand name field - validate when user leaves the field
    var brandNameInput = document.getElementById('brandName');
    if (brandNameInput) {
        brandNameInput.addEventListener('blur', function () {
            clearFieldErrors('brandName');
            validateBrandName(this.value.trim(), function () {
                // Validation complete
            });
        });
    }

    // Model name field
    var modelNameInput = document.getElementById('modelName');
    if (modelNameInput) {
        modelNameInput.addEventListener('blur', function () {
            clearFieldErrors('modelName');
            validateModelName(this.value.trim(), function () {
                // Validation complete
            });
        });
    }

    // Description fields - validate length in real-time
    var descriptionInput = document.getElementById('description');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function () {
            validateDescriptionLength('description', this.value);
        });
        descriptionInput.addEventListener('blur', function () {
            validateDescriptionLength('description', this.value);
        });
    }

    // Price field - validate real-time
    var priceInput = document.getElementById('price');
    if (priceInput) {
        priceInput.addEventListener('input', function () {
            validatePrice('price', this.value);
        });
        priceInput.addEventListener('blur', function () {
            validatePrice('price', this.value);
        });
    }

    // Rating field - validate real-time
    var ratingInput = document.getElementById('rating');
    if (ratingInput) {
        ratingInput.addEventListener('input', function () {
            validateRating('rating', this.value);
        });
        ratingInput.addEventListener('blur', function () {
            validateRating('rating', this.value);
        });
    }

    // Year fields - validate real-time
    var foundedInput = document.getElementById('founded');
    if (foundedInput) {
        foundedInput.addEventListener('input', function () {
            validateYear('founded', this.value, 1900, 2025);
        });
        foundedInput.addEventListener('blur', function () {
            validateYear('founded', this.value, 1900, 2025);
        });
    }

    var releaseYearInput = document.getElementById('releaseYear');
    if (releaseYearInput) {
        releaseYearInput.addEventListener('input', function () {
            validateYear('releaseYear', this.value, 1970, 2025);
        });
        releaseYearInput.addEventListener('blur', function () {
            validateYear('releaseYear', this.value, 1970, 2025);
        });
    }
}

/**
 * Main form validation function
 */
function validateForm(form, callback) {
    var isValid = true;
    var pendingValidations = 0;
    var validationComplete = false;

    // Get all form fields
    var inputs = form.querySelectorAll('input, textarea, select');

    // First pass: validate all basic fields
    for (var i = 0; i < inputs.length; i++) {
        (function (input) {
            var fieldId = input.id;
            var fieldValue = input.value.trim();

            // Skip file inputs and hidden fields
            if (input.type === 'file' || !fieldId || input.type === 'hidden') {
                return;
            }

            // Clear previous errors
            clearFieldErrors(fieldId);

            // Validate required fields
            if (input.hasAttribute('required')) {
                if (!fieldValue) {
                    showFieldError(fieldId, 'Este campo es obligatorio.');
                    isValid = false;
                }
            }

            // Country validation
            if (fieldId === 'country' && fieldValue) {
                if (fieldValue.length < 2) {
                    showFieldError(fieldId, 'El país debe tener al menos 2 caracteres.');
                    isValid = false;
                }
            }

            // Year validations
            if (fieldId === 'founded' && fieldValue) {
                var year = parseInt(fieldValue, 10);
                if (Number.isNaN(year) || year < 1900 || year > 2025) {
                    showFieldError(fieldId, 'El año debe estar entre 1900 y 2025.');
                    isValid = false;
                }
            }

            if (fieldId === 'releaseYear' && fieldValue) {
                var year = parseInt(fieldValue, 10);
                if (Number.isNaN(year) || year < 1970 || year > 2025) {
                    showFieldError(fieldId, 'El año debe estar entre 1970 y 2025.');
                    isValid = false;
                }
            }

            // Description validation
            if (fieldId === 'description' && fieldValue) {
                var isModelForm = document.getElementById('modelName') !== null;
                var minLength = isModelForm ? 10 : 20;
                var maxLength = isModelForm ? 500 : 300;

                if (fieldValue.length < minLength || fieldValue.length > maxLength) {
                    showFieldError(fieldId, 'La descripción debe tener entre ' + minLength + ' y ' + maxLength + ' caracteres. Actual: ' + fieldValue.length);
                    isValid = false;
                }
            }

            // Price validation
            if (fieldId === 'price' && fieldValue) {
                var price = parseFloat(fieldValue);
                if (Number.isNaN(price) || price < 0) {
                    showFieldError(fieldId, 'El precio debe ser un número positivo.');
                    isValid = false;
                }
            }

            // Rating validation
            if (fieldId === 'rating' && fieldValue) {
                var rating = parseFloat(fieldValue);
                if (Number.isNaN(rating) || rating < 0 || rating > 5) {
                    showFieldError(fieldId, 'La valoración debe estar entre 0 y 5.');
                    isValid = false;
                }
            }

            // Category validation
            if (fieldId === 'category' && fieldValue === '') {
                showFieldError(fieldId, 'Selecciona una categoría.');
                isValid = false;
            }
        })(inputs[i]);
    }

    // Second pass: validate brand name with AJAX if needed
    var brandNameInput = document.getElementById('brandName');
    if (brandNameInput && brandNameInput.value.trim() && isValid) {
        var brandValue = brandNameInput.value.trim();

        // Check if starts with uppercase
        if (!/^[A-ZÁÉÍÓÚÑ]/.test(brandValue)) {
            showFieldError('brandName', 'El nombre debe comenzar con una letra mayúscula.');
            callback(false);
            return;
        }

        pendingValidations++;
        validateBrandName(brandValue, function (isUnique) {
            pendingValidations--;
            if (!isUnique) {
                isValid = false;
            }
            if (pendingValidations === 0 && !validationComplete) {
                validationComplete = true;
                // Check for model name validation
                var modelNameInput = document.getElementById('modelName');
                if (modelNameInput && modelNameInput.value.trim() && isValid) {
                    pendingValidations++;
                    validateModelName(modelNameInput.value.trim(), function (isUnique) {
                        pendingValidations--;
                        if (!isUnique) {
                            isValid = false;
                        }
                        if (pendingValidations === 0) {
                            callback(isValid);
                        }
                    });
                } else {
                    callback(isValid);
                }
            }
        });
    } else if (brandNameInput && brandNameInput.value.trim()) {
        // Brand name starts with uppercase check (no AJAX needed)
        if (!/^[A-ZÁÉÍÓÚÑ]/.test(brandNameInput.value.trim())) {
            showFieldError('brandName', 'El nombre debe comenzar con una letra mayúscula.');
            isValid = false;
        }
        callback(isValid);
    } else {
        // Check for model name validation
        var modelNameInput = document.getElementById('modelName');
        if (modelNameInput && modelNameInput.value.trim() && isValid) {
            pendingValidations++;
            validateModelName(modelNameInput.value.trim(), function (isUnique) {
                pendingValidations--;
                if (!isUnique) {
                    isValid = false;
                }
                callback(isValid);
            });
        } else {
            callback(isValid);
        }
    }
}

/**
 * Validate brand name uniqueness via AJAX
 */
function validateBrandName(name, callback) {
    if (!name) {
        callback(true);
        return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/check-brand-name', true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
        if (xhr.status === 200) {
            try {
                var data = JSON.parse(xhr.responseText);
                if (!data.available) {
                    showFieldError('brandName', 'Ya existe una marca con ese nombre.');
                    callback(false);
                } else {
                    callback(true);
                }
            } catch (e) {
                console.error('Error parsing response:', e);
                callback(true);
            }
        } else {
            console.error('Error checking brand name:', xhr.status);
            callback(true);
        }
    };

    xhr.onerror = function () {
        console.error('Error checking brand name');
        callback(true);
    };

    try {
        xhr.send(JSON.stringify({ name: name }));
    } catch (e) {
        console.error('Error sending request:', e);
        callback(true);
    }
}

/**
 * Validate model name uniqueness via AJAX
 */
function validateModelName(name, callback) {
    if (!name) {
        callback(true);
        return;
    }

    // Get brand ID from the form action
    var form = document.querySelector('form');
    var action = form.getAttribute('action');

    // Extract brand ID from URL (e.g., /brand/123/model/new or /brand/123/model/456/edit)
    var brandIdMatch = action.match(/\/brand\/([^/]+)/);
    if (!brandIdMatch) {
        callback(true);
        return;
    }

    var brandId = brandIdMatch[1];

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/check-model-name', true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
        if (xhr.status === 200) {
            try {
                var data = JSON.parse(xhr.responseText);
                if (!data.available) {
                    showFieldError('modelName', 'Ya existe un modelo con ese nombre en esta marca.');
                    callback(false);
                } else {
                    callback(true);
                }
            } catch (e) {
                console.error('Error parsing response:', e);
                callback(true);
            }
        } else {
            // Server returned non-200 — treat as available (don't block client-side UX)
            callback(true);
        }
    };

    xhr.onerror = function () {
        // Network error — prefer to allow the form to proceed
        callback(true);
    };

    try {
        xhr.send(JSON.stringify({ name: name, brandId: brandId }));
    } catch (e) {
        console.error('Error sending request:', e);
        callback(true);
    }
}

/**
 * Validate description length
 */
function validateDescriptionLength(fieldId, value) {
    var trimmed = value.trim();
    var isModelForm = document.getElementById('modelName') !== null;
    var minLength = isModelForm ? 10 : 20;
    var maxLength = isModelForm ? 500 : 300;

    clearFieldErrors(fieldId);

    if (!trimmed) {
        showFieldError(fieldId, 'La descripción es obligatoria.');
        return false;
    }

    if (trimmed.length < minLength || trimmed.length > maxLength) {
        showFieldError(fieldId, 'La descripción debe tener entre ' + minLength + ' y ' + maxLength + ' caracteres. Actual: ' + trimmed.length);
        return false;
    }

    return true;
}

/**
 * Validate price
 */
function validatePrice(fieldId, value) {
    clearFieldErrors(fieldId);

    if (!value.trim()) {
        showFieldError(fieldId, 'El precio es obligatorio.');
        return false;
    }

    var price = parseFloat(value);
    if (Number.isNaN(price) || price < 0) {
        showFieldError(fieldId, 'El precio debe ser un número positivo.');
        return false;
    }

    return true;
}

/**
 * Validate rating
 */
function validateRating(fieldId, value) {
    clearFieldErrors(fieldId);

    if (!value.trim()) {
        return true; // Optional field
    }

    var rating = parseFloat(value);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
        showFieldError(fieldId, 'La valoración debe estar entre 0 y 5.');
        return false;
    }

    return true;
}

/**
 * Validate year field
 */
function validateYear(fieldId, value, minYear, maxYear) {
    clearFieldErrors(fieldId);

    if (!value.trim()) {
        showFieldError(fieldId, 'Este campo es obligatorio.');
        return false;
    }

    var year = parseInt(value, 10);
    if (Number.isNaN(year) || year < minYear || year > maxYear) {
        showFieldError(fieldId, 'El año debe estar entre ' + minYear + ' y ' + maxYear + '.');
        return false;
    }

    return true;
}

/**
 * Show field error message with Bootstrap styling
 */
function showFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    // Find the parent div that contains the label and input (usually col-12, col-md-6, etc.)
    var wrapper = field.parentElement;
    while (wrapper && !wrapper.classList.contains('col-12') && !wrapper.classList.contains('col-md-6') && !wrapper.classList.contains('col-md-4') && !wrapper.classList.contains('col-6')) {
        wrapper = wrapper.parentElement;
    }

    if (!wrapper) wrapper = field.parentElement; // Fallback to direct parent

    // Add Bootstrap invalid class
    field.classList.add('is-invalid');

    // Create or get feedback element
    var feedback = wrapper.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback d-block';
        field.parentNode.insertBefore(feedback, field.nextSibling);
    } else {
        // Remove d-none class if it exists
        feedback.classList.remove('d-none');
        feedback.classList.add('d-block');
    }

    feedback.textContent = message;
    feedback.style.display = 'block';
}

/**
 * Clear errors for a specific field
 */
function clearFieldErrors(fieldId) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('is-invalid');
    field.classList.remove('is-valid');

    // Find the parent container
    var wrapper = field.parentElement;
    while (wrapper && !wrapper.classList.contains('col-12') && !wrapper.classList.contains('col-md-6') && !wrapper.classList.contains('col-md-4') && !wrapper.classList.contains('col-6')) {
        wrapper = wrapper.parentElement;
    }

    if (!wrapper) wrapper = field.parentElement; // Fallback to direct parent

    var feedback = wrapper.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.classList.add('d-none');
        feedback.classList.remove('d-block');
        feedback.style.display = 'none';
    }
}

/**
 * Clear all form errors
 */
function clearAllErrors(form) {
    var fields = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < fields.length; i++) {
        if (fields[i].id) {
            clearFieldErrors(fields[i].id);
        }
    }
}
/**
 * Submit form via AJAX with spinner and error/success handling
 */
function submitFormAjax(form) {
    // Create style for spinner animation
    var style = document.createElement('style');
    style.textContent = '@keyframes spinnerRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    // Show spinner with larger size
    var spinnerHTML = '<div id="loadingSpinner" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 99999; display: flex; justify-content: center; align-items: center;">' +
        '<div style="border: 6px solid rgba(255, 255, 255, 0.3); width: 80px; height: 80px; border-radius: 50%; border-top-color: #fff; animation: spinnerRotate 1s linear infinite;"></div>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', spinnerHTML);

    // Collect form data
    var formData = new FormData(form);
    var action = form.getAttribute('action');
    var method = form.getAttribute('method') || 'POST';

    var xhr = new XMLHttpRequest();
    xhr.open(method, action, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onload = function () {
        // Hide spinner
        var spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.remove();
        }

        if (xhr.status === 200 || xhr.status === 201) {
            // Success - try to handle AJAX-friendly responses
            // determine if this was the model new form before parsing response
            var isModelNew = /\/model\/(new)?$/.test(action) || !!form.querySelector('#modelName');
            try {
                var response = JSON.parse(xhr.responseText);

                // If server returned a model for edit/create, prefer redirecting to its detail
                if (response.model && response.model._id) {
                    var bid = response.brandId || response.model.brandId || null;
                    if (bid) {
                        window.location.href = '/brand/' + bid + '/model/' + response.model._id;
                        return;
                    } else if (response.model._id) {
                        // fallback to model detail without brand
                        window.location.href = '/brand/' + (response.brandId || '') + '/model/' + response.model._id;
                        return;
                    }
                }

                if (isModelNew) {
                    // If server returned full model object, use it. Otherwise build minimal from form values.
                    var model = response.model || null;
                    var brandId = response.brandId || null;

                    if (!model) {
                        // Try to assemble minimal model using form fields
                        model = {
                            _id: response.modelId || ('m_' + Date.now()),
                            name: form.querySelector('#name') ? form.querySelector('#name').value : '',
                            category: form.querySelector('#category') ? form.querySelector('#category').value : '',
                            release_year: form.querySelector('#release_year') ? form.querySelector('#release_year').value : '',
                            price: form.querySelector('#price') ? form.querySelector('#price').value : '',
                            average_rating: form.querySelector('#average_rating') ? form.querySelector('#average_rating').value : '',
                            colorway: form.querySelector('#colorway') ? form.querySelector('#colorway').value : '',
                            size_range: form.querySelector('#size_range') ? form.querySelector('#size_range').value : ''
                        };
                    }

                    // Append to list and clear form
                    appendModelToList(model, brandId);
                    try { form.reset(); } catch (e) {}
                    // Remove file input preview if exists
                    var cover = form.querySelector('#cover_image');
                    if (cover) { cover.value = ''; }

                    return;
                }

                // Brand creation or other actions - keep previous redirect behavior
                if (response.brandId) {
                    window.location.href = '/brand/' + response.brandId;
                } else if (response.modelId && response.brandId) {
                    window.location.href = '/brand/' + response.brandId + '/model/' + response.modelId;
                } else {
                    window.location.href = '/';
                }
            } catch (e) {
                // If response is not JSON
                if (isModelNew) {
                    // Build minimal model from form fields and append to list
                    try {
                        var model = {
                            _id: ('m_' + Date.now()),
                            name: form.querySelector('#name') ? form.querySelector('#name').value : '',
                            category: form.querySelector('#category') ? form.querySelector('#category').value : '',
                            release_year: form.querySelector('#release_year') ? form.querySelector('#release_year').value : '',
                            price: form.querySelector('#price') ? form.querySelector('#price').value : '',
                            average_rating: form.querySelector('#average_rating') ? form.querySelector('#average_rating').value : '',
                            colorway: form.querySelector('#colorway') ? form.querySelector('#colorway').value : '',
                            size_range: form.querySelector('#size_range') ? form.querySelector('#size_range').value : ''
                        };
                        var bId = null;
                        try { var actMatch = action.match(/\/brand\/([^/]+)/); if (actMatch) bId = actMatch[1]; } catch(_){}
                        appendModelToList(model, bId);
                        try { form.reset(); } catch (e) {}
                        return;
                    } catch (e) {
                        // fallthrough to redirect fallback
                    }
                }

                // Try to follow server redirect (responseURL) if present
                try {
                    var respUrl = xhr.responseURL || '';
                    if (respUrl && (/\/brand\//.test(respUrl) || /\/model\//.test(respUrl))) {
                        window.location.href = respUrl;
                        return;
                    }
                } catch (_) {}

                // Fallback: redirect based on form action
                if (action.includes('/model/')) {
                    var brandMatch = action.match(/\/brand\/([^/]+)/);
                    if (brandMatch) {
                        window.location.href = '/brand/' + brandMatch[1];
                        return;
                    }
                }
                window.location.href = '/';
            }
        } else {
            // Error - show error dialog
            try {
                var errorResponse = JSON.parse(xhr.responseText);
                var errorMessage = errorResponse.message || 'Error al guardar. Intenta nuevamente.';
                showErrorDialog(errorMessage, form);
            } catch (e) {
                showErrorDialog('Error al guardar. Intenta nuevamente.', form);
                
            }
        }
    };

    xhr.onerror = function () {
        // Hide spinner
        var spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.remove();
        }
        showErrorDialog('Error de conexión. Intenta nuevamente.', form);
    };

    // Delay 1.5 seconds before sending to show spinner
    setTimeout(function () {
        try {
            xhr.send(formData);
        } catch (e) {
            // Hide spinner
            var spinner = document.getElementById('loadingSpinner');
            if (spinner) {
                spinner.remove();
            }
            showErrorDialog('Error al enviar el formulario.', form);
        }
    }, 1500);
}

/**
 * Show error dialog
 */
function showErrorDialog(message, form) {
    // Convert newlines to HTML line breaks for better display
    var displayMessage = message.replace(/\n/g, '<br>');

    // Create modal HTML
    var modalHTML = '<div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">' +
        '<div class="modal-dialog">' +
        '<div class="modal-content">' +
        '<div class="modal-header bg-danger text-white">' +
        '<h5 class="modal-title" id="errorModalLabel">Error al guardar</h5>' +
        '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>' +
        '</div>' +
        '<div class="modal-body">' +
        displayMessage +
        '</div>' +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        var modal = new bootstrap.Modal(document.getElementById('errorModal'));
        modal.show();

        // Remove modal when hidden
        document.getElementById('errorModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    } else {
        // Fallback if Bootstrap JS not loaded
        alert('Error: ' + message);
        document.getElementById('errorModal').remove();
    }
}

/**
 * Append a model card to the models list using available data
 */
function appendModelToList(model, brandId) {
    if (!model) return;

    var container = document.querySelector('main .col-12.col-lg-7 .row.g-4');
    if (!container) {
        // Try a generic selector
        container = document.querySelector('.row.g-4');
    }
    if (!container) return;

    var col = document.createElement('div');
    col.className = 'col-12 col-md-6';

    var card = document.createElement('div');
    card.className = 'card h-100';

    var img = document.createElement('img');
    img.className = 'card-img-top';
    img.alt = 'Imagen de la sneaker ' + (model.name || '');
    // Use a predictable image route if id present
    if (model._id) {
        img.src = '/brand.models/' + model._id + '/image';
    } else {
        img.src = '/img/sneakers/placeholder.png';
    }

    var body = document.createElement('div');
    body.className = 'card-body';

    var h5 = document.createElement('h5');
    h5.className = 'card-title';
    h5.textContent = model.name || '';

    var p1 = document.createElement('p');
    p1.className = 'mb-1 small text-muted';
    p1.textContent = (model.category || '') + ' · ' + (model.release_year || '');

    var p2 = document.createElement('p');
    p2.className = 'mb-1 small text-muted';
    p2.textContent = 'Colorway: ' + (model.colorway || '') + ' · Tallas: ' + (model.size_range || '');

    var pPrice = document.createElement('p');
    pPrice.className = 'fw-semibold';
    pPrice.textContent = (model.price || '') + ' € ';

    var actions = document.createElement('div');
    actions.className = 'd-flex gap-2';

    var editLink = document.createElement('a');
    editLink.className = 'btn btn-outline-primary btn-sm js-edit-model';
    editLink.href = '/brand/' + (brandId || '') + '/model/' + (model._id || '') + '/edit';
    editLink.textContent = 'Editar';

    var delForm = document.createElement('form');
    delForm.className = 'js-delete-model';
    delForm.action = '/brand/' + (brandId || '') + '/model/' + (model._id || '') + '/delete';
    delForm.method = 'POST';

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline-danger btn-sm';
    delBtn.type = 'submit';
    delBtn.textContent = 'Borrar';

    delForm.appendChild(delBtn);

    actions.appendChild(editLink);
    actions.appendChild(delForm);

    body.appendChild(h5);
    body.appendChild(p1);
    body.appendChild(p2);
    body.appendChild(pPrice);
    body.appendChild(actions);

    card.appendChild(img);
    card.appendChild(body);
    col.appendChild(card);

    // Insert at the beginning
    if (container.firstChild) container.insertBefore(col, container.firstChild);
    else container.appendChild(col);

    // Re-init delete listeners for this new element (UIHelpers is in ui.js)
    if (window.UIHelpers && typeof window.UIHelpers.initDeleteModelAjax === 'function') {
        try { window.UIHelpers.initDeleteModelAjax(); } catch (e) {}
    } else {
        // As a fallback, re-run delete init from ui.js by dispatching DOMContentLoaded may be heavy; instead, attach simple handler
        var forms = col.querySelectorAll('form.js-delete-model');
        for (var i = 0; i < forms.length; i++) {
            forms[i].addEventListener('submit', function (ev) { ev.preventDefault(); /* UI handles confirm */ });
        }
    }
}

/**
 * Inline edit: transform a card into an edit form and submit via AJAX
 */
function initInlineModelEdit() {
    // initInlineModelEdit initialized
    // Use capture phase so we can prevent navigation before other listeners
    document.addEventListener('click', function (e) {
        // initInlineModelEdit received click event
        var target = e.target;
        // click target logged (debug removed)
        if (!target) return;

        var link = target.closest && target.closest('a.js-edit-model, a[href*="/model/"][href$="/edit"]');
        if (!link) return;

        // edit link clicked

        // Prevent default navigation and stop propagation immediately
        try { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); } catch (ex) {}

        var card = link.closest('.card');
        // found card?
        if (!card) return;
        var cardBody = card.querySelector('.card-body');
        // found cardBody?
        if (!cardBody) return;

        try { if (cardBody.querySelector('form.inline-edit')) { /* already editing, abort */ return; } } catch (e) { console.error(e); }

        // building inline form...

        // Helper: set the price text while preserving an existing badge <span>
        var setPricePreserveBadge = function(el, priceVal) {
            if (!el) return;
            try {
                var badge = el.querySelector && el.querySelector('.badge');
                var text = (priceVal ? (String(priceVal) + ' € ') : '');
                // find first text node
                var tn = null;
                for (var i = 0; i < el.childNodes.length; i++) {
                    if (el.childNodes[i].nodeType === 3) { tn = el.childNodes[i]; break; }
                }
                if (tn) {
                    tn.nodeValue = text;
                } else {
                    // insert text node before badge if exists, else set as textContent
                    if (badge) el.insertBefore(document.createTextNode(text), badge);
                    else el.textContent = text;
                }
                // ensure badge text updated separately
                if (badge) {
                    // keep badge classes; update only its text content
                    badge.textContent = badge.textContent.replace(/^\s*⭐.*$/,'');
                }
            } catch (e) {}
        };

        if (cardBody.querySelector('form.inline-edit')) return; // already editing

        var originalHTML = cardBody.innerHTML;

        // Read current values
        var getText = function (sel) { var el = cardBody.querySelector(sel); return el ? el.textContent.trim() : ''; };
        var currentName = getText('.card-title');
        var metaEls = cardBody.querySelectorAll('.mb-1.small.text-muted');
        var category = '';
        var release_year = '';
        if (metaEls && metaEls[0]) {
            var parts = metaEls[0].textContent.split('·').map(function(s){ return s.trim(); });
            category = parts[0] || '';
            release_year = parts[1] || '';
        }
        var colorway = '';
        var size_range = '';
        if (metaEls && metaEls[1]) {
            var parts2 = metaEls[1].textContent.split('·').map(function(s){ return s.trim(); });
            if (parts2.length >= 2) {
                colorway = parts2[0].replace('Colorway:', '').trim();
                size_range = parts2[1].replace('Tallas:', '').trim();
            }
        }
        // Extract numeric price robustly (ignore any badge text that may be inside)
        var rawPrice = getText('.fw-semibold').replace('€', '').trim();
        var price = '';
        try {
            var m0 = rawPrice.match(/[0-9]+[\.,]?[0-9]*/);
            if (m0 && m0[0]) price = m0[0].replace(',', '.');
        } catch (e) { price = ''; }
        // If no numeric price found, try reading data-price from card or ancestors
        if (!price) {
            try {
                var curA = card;
                while (curA && curA !== document.documentElement) {
                    if (curA.getAttribute && curA.getAttribute('data-price') != null) {
                        var dpv = curA.getAttribute('data-price') || '';
                        var m1 = dpv.match(/[0-9]+[\.,]?[0-9]*/);
                        if (m1 && m1[0]) { price = m1[0].replace(',', '.'); break; }
                        price = dpv; break;
                    }
                    curA = curA.parentElement;
                }
            } catch (e) { /* ignore */ }
        }
        // helper to read data-* from ancestor elements
        var findAncestorData = function (el, attr) {
            var cur = el;
            while (cur && cur !== document.documentElement) {
                try {
                    if (cur.getAttribute && cur.getAttribute('data-' + attr) != null) return cur.getAttribute('data-' + attr);
                } catch (e) {}
                cur = cur.parentElement;
            }
            return null;
        };
        // If visible price is empty, try data-price on card or ancestors
        if ((!price || price === '')) {
            try {
                var dp = findAncestorData(card, 'price');
                if (dp) {
                    var m = dp.match(/[0-9]+[\.,]?[0-9]*/);
                    if (m && m[0]) price = m[0].replace(',', '.');
                    else price = dp;
                }
            } catch (e) {}
        }
        var badge = cardBody.querySelector('.badge');
        var average_rating = badge ? badge.textContent.replace('⭐', '').trim() : '';

        // Build form elements
        var form = document.createElement('form');
        form.className = 'inline-edit';
        form.action = link.href;
        form.method = 'POST';
        form.enctype = 'multipart/form-data';

        // Name
        var nameWrap = document.createElement('div'); nameWrap.className = 'mb-2';
        var nameInput = document.createElement('input'); nameInput.name = 'name'; nameInput.className = 'form-control form-control-sm'; nameInput.required = true; nameInput.placeholder = 'Nombre'; nameInput.value = currentName;
        nameWrap.appendChild(nameInput);

        // Description
        var descWrap = document.createElement('div'); descWrap.className = 'mb-2';
        var descInput = document.createElement('textarea'); descInput.name = 'description'; descInput.className = 'form-control form-control-sm'; descInput.rows = 2; descInput.placeholder = 'Descripción';
        descWrap.appendChild(descInput);

        // Row: category / year
        var row1 = document.createElement('div'); row1.className = 'row g-2 mb-2';
        var colCat = document.createElement('div'); colCat.className = 'col-6'; var catInput = document.createElement('input'); catInput.name='category'; catInput.className='form-control form-control-sm'; catInput.placeholder='Categoría'; catInput.value=category; colCat.appendChild(catInput);
        var colYear = document.createElement('div'); colYear.className='col-6'; var yearInput = document.createElement('input'); yearInput.name='release_year'; yearInput.type='number'; yearInput.min=1970; yearInput.max=2025; yearInput.className='form-control form-control-sm'; yearInput.placeholder='Año'; yearInput.value=release_year; colYear.appendChild(yearInput);
        row1.appendChild(colCat); row1.appendChild(colYear);

        // Row: price / rating
        var row2 = document.createElement('div'); row2.className='row g-2 mb-2';
        var colPrice = document.createElement('div'); colPrice.className='col-6'; var priceInput = document.createElement('input'); priceInput.name='price'; priceInput.type='number'; priceInput.step='0.01'; priceInput.min='0'; priceInput.className='form-control form-control-sm'; priceInput.placeholder='Precio'; priceInput.value=price; colPrice.appendChild(priceInput);
        var colRating = document.createElement('div'); colRating.className='col-6'; var ratingInput = document.createElement('input'); ratingInput.name='average_rating'; ratingInput.type='number'; ratingInput.step='0.1'; ratingInput.min='0'; ratingInput.max='5'; ratingInput.className='form-control form-control-sm'; ratingInput.placeholder='Valoración'; ratingInput.value=average_rating; colRating.appendChild(ratingInput);
        row2.appendChild(colPrice); row2.appendChild(colRating);

        // Row: colorway / size
        var row3 = document.createElement('div'); row3.className='row g-2 mb-2';
        var colColor = document.createElement('div'); colColor.className='col-6'; var colorInput = document.createElement('input'); colorInput.name='colorway'; colorInput.className='form-control form-control-sm'; colorInput.placeholder='Colorway'; colorInput.value=colorway; colColor.appendChild(colorInput);
        var colSize = document.createElement('div'); colSize.className='col-6'; var sizeInput = document.createElement('input'); sizeInput.name='size_range'; sizeInput.className='form-control form-control-sm'; sizeInput.placeholder='Tallas'; sizeInput.value=size_range; colSize.appendChild(sizeInput);
        row3.appendChild(colColor); row3.appendChild(colSize);

        // Fallback: try to read data-* attributes from ancestor containers (price, description)
        var findAncestorData = function (el, attr) {
            var cur = el;
            while (cur && cur !== document.documentElement) {
                try {
                    if (cur.getAttribute && cur.getAttribute('data-' + attr) != null) return cur.getAttribute('data-' + attr);
                } catch (e) {}
                cur = cur.parentElement;
            }
            return null;
        };

        // If price empty, try data-price
        if ((!price || price === '') ) {
            var dp = findAncestorData(card, 'price');
            if (dp) {
                var m = dp.match(/[0-9]+[\.,]?[0-9]*/);
                if (m && m[0]) price = m[0].replace(',', '.');
                else price = dp;
            }
        }

        // Image input + preview
        var imgRow = document.createElement('div'); imgRow.className='mb-2 d-flex gap-2 align-items-center';
        var fileInput = document.createElement('input'); fileInput.type='file'; fileInput.name='cover_image'; fileInput.accept='image/*'; fileInput.className='form-control form-control-sm';
        var preview = document.createElement('img'); preview.className='d-none rounded'; preview.style.maxHeight='80px'; preview.alt='Preview';
        imgRow.appendChild(fileInput); imgRow.appendChild(preview);

        // Actions
        var actions = document.createElement('div'); actions.className='d-flex gap-2';
        var btnSave = document.createElement('button'); btnSave.type='submit'; btnSave.className='btn btn-primary btn-sm'; btnSave.textContent='Guardar';
        var btnCancel = document.createElement('button'); btnCancel.type='button'; btnCancel.className='btn btn-secondary btn-sm js-cancel-inline'; btnCancel.textContent='Cancelar';
        actions.appendChild(btnSave); actions.appendChild(btnCancel);

        // Assemble form
        form.appendChild(nameWrap); form.appendChild(descWrap); form.appendChild(row1); form.appendChild(row2); form.appendChild(row3); form.appendChild(imgRow); form.appendChild(actions);

        // Prefill description from data-description if present
        try {
            var dd = findAncestorData(card, 'description');
            if (dd) descInput.value = dd;
        } catch (e) {}

        // Also set the price input value from computed price (after fallback)
        try { priceInput.value = (price || ''); priceInput.setAttribute('value', (price || '')); } catch (e) {}

        // Insert form
        cardBody.innerHTML=''; cardBody.appendChild(form);

        // File preview handler
        fileInput.addEventListener('change', function () {
            var f = fileInput.files && fileInput.files[0];
            if (!f) { preview.src=''; preview.classList.add('d-none'); return; }
            var reader = new FileReader();
            reader.onload = function (ev) { preview.src = ev.target.result; preview.classList.remove('d-none'); };
            reader.readAsDataURL(f);
        });

        // Cancel
        btnCancel.addEventListener('click', function () { cardBody.innerHTML = originalHTML; });

        // Submit
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();

            // Basic validation
            if (!nameInput.value.trim()) { showErrorDialog('El nombre es obligatorio.'); return; }
            if (!catInput.value.trim()) { showErrorDialog('La categoría es obligatoria.'); return; }
            if (descInput.value && (descInput.value.trim().length < 10)) { showErrorDialog('La descripción debe tener al menos 10 caracteres.'); return; }
            if (yearInput.value) { var y = parseInt(yearInput.value,10); if (Number.isNaN(y) || y<1970 || y>2025) { showErrorDialog('El año debe estar entre 1970 y 2025.'); return; } }
            if (priceInput.value) { var p = parseFloat(priceInput.value); if (Number.isNaN(p) || p<0) { showErrorDialog('El precio debe ser un número positivo.'); return; } }
            if (ratingInput.value) { var r = parseFloat(ratingInput.value); if (Number.isNaN(r) || r<0 || r>5) { showErrorDialog('La valoración debe estar entre 0 y 5.'); return; } }

            var fd = new FormData(form);

            var xhr = new XMLHttpRequest(); xhr.open('POST', form.action, true); xhr.setRequestHeader('X-Requested-With','XMLHttpRequest');

            // show small spinner on save button
            btnSave.disabled = true; var oldText = btnSave.textContent; btnSave.textContent = 'Guardando...';

            xhr.onload = function () {
                btnSave.disabled = false; btnSave.textContent = oldText;
                if (xhr.status === 200 || xhr.status === 201) {
                    try {
                        var res = JSON.parse(xhr.responseText);
                        var updated = res.model || null;
                        // Update DOM values
                        var titleEl = card.querySelector('.card-title'); if (titleEl) titleEl.textContent = (updated && updated.name) ? updated.name : nameInput.value;
                var price = getText('.fw-semibold').replace('€', '').trim();        
                // Robustly search ancestors for data-price / data-description
                var findAncestorData = function (el, attr) {
                    var cur = el;
                    while (cur && cur !== document.documentElement) {
                        try {
                            if (cur.getAttribute && cur.getAttribute('data-' + attr) != null) return cur.getAttribute('data-' + attr);
                        } catch (e) {}
                        cur = cur.parentElement;
                    }
                    return null;
                };

                var dp = findAncestorData(card, 'price');
                var dd = findAncestorData(card, 'description');
                // Inline edit - found data-price / data-description

                if ((!price || price === '') && dp) price = dp;
                var descriptionFromData = dd || '';

                // Normalize price to numeric string (remove currency and non-digit except , and .)
                if (price && typeof price === 'string') {
                    var m = price.match(/[0-9]+[\.,]?[0-9]*/);
                    if (m && m[0]) {
                        price = m[0].replace(',', '.');
                    } else {
                        price = '';
                    }
                }
                        if (metaEls && metaEls.length>0) metaEls[0].textContent = (catInput.value||'') + ' · ' + (yearInput.value||'');
                        if (metaEls && metaEls.length>1) metaEls[1].textContent = 'Colorway: ' + (colorInput.value||'') + ' · Tallas: ' + (sizeInput.value||'');
                // Prefill description from data attribute if available
                if (descriptionFromData) descInput.value = descriptionFromData;
                        var priceEl = card.querySelector('.fw-semibold');
                        if (priceEl) {
                            var shownPrice = (updated && (updated.price || updated.price === 0)) ? String(updated.price) : (priceInput.value||'');
                            setPricePreserveBadge(priceEl, shownPrice);
                        }
                        var badge2 = card.querySelector('.badge'); if (badge2) badge2.textContent = '⭐ ' + ((updated && updated.average_rating) ? String(updated.average_rating) : (ratingInput.value||''));

                        // Update container data-* attributes so future inline edits use fresh values
                        try {
                            var containerWithData = card.closest('[data-price], [data-average_rating]');
                            if (!containerWithData) containerWithData = card.closest('.col-12, .col-md-6') || card.parentElement;
                            if (containerWithData) {
                                if (updated && (updated.price || updated.price === 0)) containerWithData.setAttribute('data-price', String(updated.price));
                                else if (priceInput && priceInput.value) containerWithData.setAttribute('data-price', String(priceInput.value));
                                if (updated && updated.average_rating) containerWithData.setAttribute('data-average_rating', String(updated.average_rating));
                                else if (ratingInput && ratingInput.value) containerWithData.setAttribute('data-average_rating', String(ratingInput.value));
                                // description
                                if (updated && updated.description) containerWithData.setAttribute('data-description', updated.description);
                                else if (descInput && descInput.value) containerWithData.setAttribute('data-description', descInput.value);
                            }
                        } catch (e) {}
                        // Update image if server returned url
                        if (updated && updated._id) {
                            var imgEl = card.querySelector('img.card-img-top');
                            if (imgEl && updated._id) imgEl.src = '/brand.models/' + updated._id + '/image';
                        }

                        // restore originalHTML then patch text nodes to ensure layout same
                        cardBody.innerHTML = originalHTML;
                        var newTitle = cardBody.querySelector('.card-title'); if (newTitle) newTitle.textContent = titleEl ? titleEl.textContent : nameInput.value;
                        var newMeta = cardBody.querySelectorAll('.mb-1.small.text-muted');
                        if (newMeta && newMeta.length>0) newMeta[0].textContent = (catInput.value||'') + ' · ' + (yearInput.value||'');
                        if (newMeta && newMeta.length>1) newMeta[1].textContent = 'Colorway: ' + (colorInput.value||'') + ' · Tallas: ' + (sizeInput.value||'');

                        // Update price and badge in restored HTML
                        try {
                            var newPriceEl = cardBody.querySelector('.fw-semibold');
                            if (newPriceEl) {
                                var shownPrice = (updated && (updated.price || updated.price === 0)) ? String(updated.price) : (priceInput.value||'');
                                setPricePreserveBadge(newPriceEl, shownPrice);
                            }
                            var newBadge = cardBody.querySelector('.badge'); if (newBadge) newBadge.textContent = '⭐ ' + ((updated && updated.average_rating) ? String(updated.average_rating) : (ratingInput.value||''));
                        } catch (e) {}

                        // re-init delete handlers if needed
                        if (window.UIHelpers && typeof window.UIHelpers.initDeleteModelAjax === 'function') { try { window.UIHelpers.initDeleteModelAjax(); } catch (e) {} }
                    } catch (e) {
                        // Not JSON — fallback: assume success (200/201) and update card from form values.
                        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(_) {}
                        try {
                            // Update title
                            var titleEl2 = card.querySelector('.card-title'); if (titleEl2) titleEl2.textContent = nameInput.value;
                            // Update price shown
                            var priceStr2 = (priceInput.value||''); if (priceStr2) priceStr2 = priceStr2 + ' € ';
                            var priceEl2 = card.querySelector('.fw-semibold'); if (priceEl2) setPricePreserveBadge(priceEl2, (priceInput.value||''));
                            // Update rating
                            var badge2 = card.querySelector('.badge'); if (badge2) badge2.textContent = '⭐ ' + (ratingInput.value||'');
                            // Update meta lines
                            var metaElsFallback = card.querySelectorAll('.mb-1.small.text-muted');
                            if (metaElsFallback && metaElsFallback.length>0) metaElsFallback[0].textContent = (catInput.value||'') + ' · ' + (yearInput.value||'');
                            if (metaElsFallback && metaElsFallback.length>1) metaElsFallback[1].textContent = 'Colorway: ' + (colorInput.value||'') + ' · Tallas: ' + (sizeInput.value||'');

                            // restore originalHTML then patch text nodes to ensure layout same
                            cardBody.innerHTML = originalHTML;
                            var newTitle2 = cardBody.querySelector('.card-title'); if (newTitle2) newTitle2.textContent = nameInput.value;
                            var newMeta2 = cardBody.querySelectorAll('.mb-1.small.text-muted');
                            if (newMeta2 && newMeta2.length>0) newMeta2[0].textContent = (catInput.value||'') + ' · ' + (yearInput.value||'');
                            if (newMeta2 && newMeta2.length>1) newMeta2[1].textContent = 'Colorway: ' + (colorInput.value||'') + ' · Tallas: ' + (sizeInput.value||'');

                            // Update price and badge in restored HTML (fallback)
                            try {
                                var newPriceEl2 = cardBody.querySelector('.fw-semibold'); if (newPriceEl2) newPriceEl2.textContent = ((priceInput.value||'') ? (priceInput.value + ' € ') : '');
                                var newBadge2 = cardBody.querySelector('.badge'); if (newBadge2) newBadge2.textContent = '⭐ ' + (ratingInput.value||'');
                            } catch (e) {}

                            // re-init delete handlers if needed
                            if (window.UIHelpers && typeof window.UIHelpers.initDeleteModelAjax === 'function') { try { window.UIHelpers.initDeleteModelAjax(); } catch (e) {} }
                        } catch (inner) {
                            // If anything fails, show generic error and restore form
                            try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(_) {}
                            showErrorDialog('Respuesta inesperada del servidor. No se pudo guardar.');
                            cardBody.innerHTML = originalHTML;
                        }
                    }
                } else {
                    try { var err = JSON.parse(xhr.responseText); try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(_) {} showErrorDialog(err.message || 'Error al guardar'); }
                    catch (_) { try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(_) {} showErrorDialog('Error al guardar'); }
                }
            };

            xhr.onerror = function () { btnSave.disabled=false; btnSave.textContent=oldText; try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(_) {} showErrorDialog('Error de conexión. Intenta nuevamente.'); };

            xhr.send(fd);
        });
    }, true);
    // Prevent middle-click / auxclick from opening link in new tab
    document.addEventListener('auxclick', function (e) {
        try {
            if (e.button !== 1) return; // only middle click
            var link = e.target && e.target.closest && e.target.closest('a.js-edit-model, a[href*="/model/"][href$="/edit"]');
            if (!link) return;
            e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
            // Simulate normal click handling
            link.click();
        } catch (_) {}
    }, true);
}