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
            console.error('Error checking model name:', xhr.status);
            callback(true);
        }
    };

    xhr.onerror = function () {
        console.error('Error checking model name');
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
            // Success - redirect to detail page
            try {
                var response = JSON.parse(xhr.responseText);
                if (response.brandId) {
                    // Brand created - redirect to brand detail
                    window.location.href = '/brand/' + response.brandId;
                } else if (response.modelId && response.brandId) {
                    // Model created - redirect to model detail
                    window.location.href = '/brand/' + response.brandId + '/model/' + response.modelId;
                } else {
                    // Fallback redirect
                    window.location.href = '/';
                }
            } catch (e) {
                // If response is not JSON, try to redirect based on URL
                if (action.includes('/model/')) {
                    // Model form
                    var brandMatch = action.match(/\/brand\/([^/]+)/);
                    if (brandMatch) {
                        window.location.href = '/brand/' + brandMatch[1];
                    }
                } else {
                    // Brand form
                    window.location.href = '/';
                }
            }
        } else {
            // Error - show error dialog
            try {
                var errorResponse = JSON.parse(xhr.responseText);
                var errorMessage = errorResponse.message || 'Error al guardar. Intenta nuevamente.';
                console.log('Error response:', errorResponse);
                showErrorDialog(errorMessage, form);
            } catch (e) {
                console.log('Error parsing response:', e);
                console.log('Raw response:', xhr.responseText);
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