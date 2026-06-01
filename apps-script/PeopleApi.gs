/**
 * Google People API wrapper.
 * All calls are rate-limited to avoid quota bans.
 */

/**
 * Search for a Google Contact by phone number.
 * Returns the first matching contact's resourceName + etag, or null.
 */
function findContactByPhone(phone) {
  var digitsOnly = phone.replace(/\D/g, '');
  var last10 = digitsOnly.slice(-10);

  var options = {
    query: last10,
    readMask: 'names,phoneNumbers,metadata',
    pageSize: 10
  };

  var response = People.People.searchContacts(options);
  sleep(CONFIG.API_DELAY_MS);

  var results = response.results || [];
  for (var i = 0; i < results.length; i++) {
    var person = results[i].person;
    if (!person) continue;

    var phoneNumbers = person.phoneNumbers || [];
    for (var j = 0; j < phoneNumbers.length; j++) {
      var pn = phoneNumbers[j].value || '';
      var pnDigits = pn.replace(/\D/g, '');
      if (pnDigits.endsWith(last10)) {
        return {
          resourceName: person.resourceName,
          etag: person.etag || null
        };
      }
    }
  }

  return null;
}

/**
 * Create a new Google Contact.
 * Returns the resourceName of the created contact.
 */
function createContact(name, phone, email, uhid) {
  var contact = {
    names: [
      { givenName: name, displayName: name }
    ],
    phoneNumbers: [
      { value: phone, type: 'main' }
    ],
    emailAddresses: email ? [
      { value: email, type: 'work' }
    ] : [],
    biographies: [
      {
        value: 'UHID: ' + uhid + '\nRegistered via HMS - Wellness Medicals',
        contentType: 'TEXT_PLAIN'
      }
    ]
  };

  var result = People.People.createContact(contact);
  sleep(CONFIG.API_DELAY_MS);
  return result.resourceName || '';
}

/**
 * Update an existing Google Contact.
 * Returns the resourceName.
 */
function updateContact(resourceName, name, phone, email, uhid, etag) {
  var contact = {
    etag: etag || null,
    names: [
      { givenName: name, displayName: name }
    ],
    phoneNumbers: [
      { value: phone, type: 'main' }
    ],
    emailAddresses: email ? [
      { value: email, type: 'work' }
    ] : [],
    biographies: [
      {
        value: 'UHID: ' + uhid + '\nRegistered via HMS - Wellness Medicals',
        contentType: 'TEXT_PLAIN'
      }
    ]
  };

  var result = People.People.updateContact(
    contact,
    resourceName,
    { updatePersonFields: 'names,phoneNumbers,emailAddresses,biographies' }
  );
  sleep(CONFIG.API_DELAY_MS);
  return result.resourceName || resourceName;
}

/**
 * Delete a Google Contact.
 */
function deleteContact(resourceName) {
  People.People.deleteContact(resourceName);
  sleep(CONFIG.API_DELAY_MS);
}

/**
 * Rate-limit sleep.
 */
function sleep(ms) {
  Utilities.sleep(ms);
}
