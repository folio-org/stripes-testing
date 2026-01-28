import uuid from 'uuid';
import { recurse } from 'cypress-recurse';
import { INSTANCE_SOURCE_NAMES } from '../constants';
import QuickMarcEditor from '../fragments/quickMarcEditor';

const DEFAULT_INSTANCE = {
  source: INSTANCE_SOURCE_NAMES.FOLIO,
  discoverySuppress: false,
  staffSuppress: false,
  previouslyHeld: false,
};

const defaultDisplaySettings = {
  scope: 'ui-inventory.display-settings.manage',
  key: 'display-settings',
  value: {
    defaultSort: 'title',
    defaultColumns: ['contributors', 'publishers', 'relation', 'hrid', 'normalizedDate1'],
  },
};

Cypress.Commands.add('getInstanceById', (instanceId) => {
  return cy
    .okapiRequest({
      path: `inventory/instances/${instanceId}`,
    })
    .then(({ body }) => {
      return body;
    });
});

Cypress.Commands.add('createLoanType', (loanType) => {
  return cy
    .okapiRequest({
      path: 'loan-types',
      method: 'POST',
      body: loanType,
    })
    .then(({ body }) => {
      Cypress.env('loanTypes', body);
      return body;
    });
});

Cypress.Commands.add('createHoldingSources', (holdingSources) => {
  return cy
    .okapiRequest({
      path: 'holdings-sources',
      method: 'POST',
      body: holdingSources,
    })
    .then(({ body }) => {
      Cypress.env('holdingSourcess', body.holdingSources);
      return body;
    });
});

Cypress.Commands.add('getLoanTypes', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'loan-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('loanTypes', body.loantypes);
      return body.loantypes;
    });
});

Cypress.Commands.add('deleteLoanType', (loanId) => {
  return cy.okapiRequest({
    path: `loan-types/${loanId}`,
    method: 'DELETE',
  });
});

// Returns the LIST of all material types (array of objects, depending on searchParams)
Cypress.Commands.add('getAllMaterialTypes', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'material-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      Cypress.env('materialTypes', response.body.mtypes);
      return response.body.mtypes;
    });
});

// Returns the FIRST material type (object) from the list of all material types
Cypress.Commands.add('getMaterialTypes', (searchParams) => {
  return cy.getAllMaterialTypes(searchParams).then((materialTypes) => {
    return materialTypes.length ? materialTypes[0] : null;
  });
});

// Returns the FIRST material type (object) with the name "book"
Cypress.Commands.add('getBookMaterialType', () => {
  if (!Cypress.env('BOOK_MATERIAL_TYPE')) {
    return cy.getMaterialTypes({ limit: 1, query: 'name=="book"' }).then((materialType) => {
      Cypress.env('BOOK_MATERIAL_TYPE', materialType);
      return materialType;
    });
  } else {
    return Cypress.env('BOOK_MATERIAL_TYPE');
  }
});

// Returns the FIRST material type (object) with the name "text"
Cypress.Commands.add('getTextMaterialType', () => {
  if (!Cypress.env('TEXT_MATERIAL_TYPE')) {
    return cy.getMaterialTypes({ limit: 1, query: 'name=="text"' }).then((materialType) => {
      Cypress.env('TEXT_MATERIAL_TYPE', materialType);
      return materialType;
    });
  } else {
    return Cypress.env('TEXT_MATERIAL_TYPE');
  }
});

// Returns the FIRST material type (object) with the name "dvd"
Cypress.Commands.add('getDvdMaterialType', () => {
  if (!Cypress.env('DVD_MATERIAL_TYPE')) {
    return cy.getMaterialTypes({ limit: 1, query: 'name=="dvd"' }).then((materialType) => {
      Cypress.env('DVD_MATERIAL_TYPE', materialType);
      return materialType;
    });
  } else {
    return Cypress.env('DVD_MATERIAL_TYPE');
  }
});

// Returns default material type, should be used in most cases, if possible
Cypress.Commands.add('getDefaultMaterialType', () => {
  return cy.getBookMaterialType();
});

// TODO: update tests where cypress env is still used
Cypress.Commands.add('getLocations', (searchParams) => {
  cy.okapiRequest({
    path: 'locations',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    Cypress.env('locations', response.body.locations);
    return response.body.locations[0];
  });
});

Cypress.Commands.add('getHoldingTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'holdings-types',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('holdingsTypes', body.holdingsTypes);
    return body.holdingsTypes;
  });
});

Cypress.Commands.add('getInstanceTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'instance-types',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('instanceTypes', body.instanceTypes);
    return body.instanceTypes;
  });
});

// TODO: move to related fragment
Cypress.Commands.add('createInstanceType', (specialInstanceType) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'instance-types',
    body: specialInstanceType,
  }).then(({ body }) => {
    Cypress.env('instanceTypes', body.instanceTypes);
    return body;
  });
});

Cypress.Commands.add('deleteInstanceType', (id, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `instance-types/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('createModesOfIssuans', (specialMode) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'modes-of-issuance',
    body: specialMode,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('deleteModesOfIssuans', (id, ignoreErrors = true) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `modes-of-issuance/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('getInstanceIdentifierTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'identifier-types',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('identifierTypes', body.identifierTypes);
  });
});

// Depricated, use createFolioInstanceViaApi instead
Cypress.Commands.add('createInstance', ({ instance, holdings = [], items = [] }) => {
  const { instanceId = uuid() } = instance;

  delete instance.instanceId;

  const holdingIds = [];

  cy.okapiRequest({
    method: 'POST',
    path: 'inventory/instances',
    body: {
      ...DEFAULT_INSTANCE,
      id: instanceId,
      ...instance,
    },
    isDefaultSearchParamsRequired: false,
  }).then(() => {
    cy.wrap(holdings)
      .each((holding, i) => cy.createHolding({
        holding: { ...holding, instanceId },
        items: items[i],
      }))
      .then((holdingId) => {
        holdingIds.push(holdingId);
      });
    cy.wrap(instanceId).as('instanceId');
  });
  return cy.get('@instanceId');
});

Cypress.Commands.add('updateInstance', (requestData) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `inventory/instances/${requestData.id}`,
    body: requestData,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

// Depricated, use createFolioInstanceViaApi instead
// TODO: move preparing of IDs from createFolioInstanceViaApi into createHolding
Cypress.Commands.add('createHolding', ({ holding, items = [] }) => {
  const { holdingId = uuid() } = holding;
  delete holding.holdingId;

  const itemIds = [];
  const holdingsIds = [];

  cy.okapiRequest({
    method: 'POST',
    path: 'holdings-storage/holdings',
    body: {
      id: holdingId,
      ...holding,
    },
  })
    .then(() => {
      cy.wrap(items).each((item) => cy
        .createItem({ ...item, holdingsRecordId: holdingId })
        .then((itemId) => itemIds.push(itemId)));
    })
    .then(() => {
      cy.wrap(holding).then((holdingsId) => holdingsIds.push(holdingsId));
    });
});

Cypress.Commands.add('getHoldings', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'holdings-storage/holdings',
    searchParams,
  }).then(({ body }) => {
    return body.holdingsRecords;
  });
});

Cypress.Commands.add('deleteHoldingRecordViaApi', (holdingsRecordId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `holdings-storage/holdings/${holdingsRecordId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }).then(({ response }) => {
    cy.wait(1000);
    return response;
  });
});

Cypress.Commands.add('updateHoldingRecord', (holdingsRecordId, newParams, ignoreErrors = false) => {
  delete newParams.holdingsItems;
  delete newParams.bareHoldingsItems;
  delete newParams.holdingsTypeId;
  cy.okapiRequest({
    method: 'PUT',
    path: `holdings-storage/holdings/${holdingsRecordId}`,
    body: newParams,
    failOnStatusCode: !ignoreErrors,
  });
});

// Depricated, use createFolioInstanceViaApi instead
Cypress.Commands.add('createItem', (item, ignoreErrors = false) => {
  const { itemId = uuid() } = item;
  delete item.itemId;
  cy.okapiRequest({
    method: 'POST',
    path: 'inventory/items',
    body: {
      id: itemId,
      ...item,
    },
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  }).then((res) => {
    return res;
  });
});

Cypress.Commands.add('getItems', (searchParams) => {
  cy.okapiRequest({
    path: 'inventory/items',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('items', body.items);
    return body.items[0];
  });
});

Cypress.Commands.add('updateItemViaApi', (item) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `inventory/items/${item.id}`,
    body: { ...item },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => body);
});

Cypress.Commands.add('deleteItemViaApi', (itemId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `inventory/items/${itemId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }).then(({ response }) => {
    cy.wait(1000);
    return response;
  });
});

Cypress.Commands.add('getProductIdTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'identifier-types',
    searchParams,
  }).then((response) => {
    return response.body.identifierTypes[0];
  });
});

Cypress.Commands.add('getRecordDataInEditorViaApi', (holdingsID) => {
  cy.okapiRequest({
    method: 'GET',
    path: `records-editor/records?externalId=${holdingsID}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => cy.wrap(body).as('body'));
  return cy.get('@body');
});

Cypress.Commands.add('getInstanceHRID', (instanceUUID) => {
  return cy
    .okapiRequest({
      path: `inventory/instances/${instanceUUID}`,
    })
    .then(({ body }) => {
      return body.hrid;
    });
});

Cypress.Commands.add('updateHridHandlingSettingsViaApi', (settingsObject) => {
  return cy
    .okapiRequest({
      method: 'PUT',
      path: 'hrid-settings-storage/hrid-settings',
      body: settingsObject,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ status }) => {
      expect(status).to.eq(204);
      return status;
    });
});

Cypress.Commands.add('getHridHandlingSettingsViaApi', () => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'hrid-settings-storage/hrid-settings',
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => {
      return body;
    });
});

Cypress.Commands.add('createSimpleMarcBibViaAPI', (title) => {
  cy.okapiRequest({
    path: 'records-editor/records',
    method: 'POST',
    isDefaultSearchParamsRequired: false,
    body: {
      _actionType: 'create',
      leader: QuickMarcEditor.defaultValidLdr,
      fields: [
        {
          tag: '008',
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: '245',
          content: `$a ${title}`,
          indicators: ['\\', '\\'],
        },
      ],
      suppressDiscovery: false,
      marcFormat: 'BIBLIOGRAPHIC',
    },
  }).then(({ body }) => {
    recurse(
      () => {
        return cy.okapiRequest({
          method: 'GET',
          path: `records-editor/records/status?qmRecordId=${body.qmRecordId}`,
          isDefaultSearchParamsRequired: false,
        });
      },
      (response) => response.body.status === 'CREATED',
      {
        limit: 14,
        timeout: 80000,
        delay: 5000,
      },
    ).then((response) => {
      cy.wrap(response.body.externalId).as('createdMarcBibliographicId');

      return cy.get('@createdMarcBibliographicId');
    });
  });
});

Cypress.Commands.add(
  'createSimpleMarcHoldingsViaAPI',
  (
    instanceId,
    instanceHrid,
    locationCode,
    actionNote = 'note',
    { tag852firstIndicator = '\\' } = {},
  ) => {
    cy.okapiRequest({
      path: 'records-editor/records',
      method: 'POST',
      isDefaultSearchParamsRequired: false,
      body: {
        _actionType: 'create',
        externalId: instanceId,
        fields: [
          {
            content: instanceHrid,
            tag: '004',
          },
          {
            content: QuickMarcEditor.defaultValid008HoldingsValues,
            tag: '008',
          },
          {
            content: `$b ${locationCode}`,
            indicators: [`${tag852firstIndicator || '\\'}`, '\\'],
            tag: '852',
          },
          {
            content: `$a ${actionNote}`,
            indicators: ['\\', '\\'],
            tag: '583',
          },
        ],
        leader: QuickMarcEditor.defaultValidHoldingsLdr,
        marcFormat: 'HOLDINGS',
        suppressDiscovery: false,
      },
    }).then(({ body }) => {
      cy.expect(body.status === 'IN_PROGRESS');

      recurse(
        () => {
          return cy.okapiRequest({
            method: 'GET',
            path: `records-editor/records/status?qmRecordId=${body.qmRecordId}`,
            isDefaultSearchParamsRequired: false,
          });
        },
        (response) => response.body.status === 'CREATED',
        {
          limit: 10,
          timeout: 80000,
          delay: 5000,
        },
      ).then((response) => {
        cy.wrap(response.body.externalId).as('createdMarcHoldingId');

        return cy.get('@createdMarcHoldingId');
      });
    });
  },
);

Cypress.Commands.add('getInventoryInstanceByStatus', (status) => {
  const UpdatedUrl = encodeURI(
    `search/instances?expandAll=true&limit=1&query=items.status.name==${status}`,
  );
  cy.okapiRequest({
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('createMarcBibliographicViaAPI', (LDR, fields) => {
  cy.okapiRequest({
    path: 'records-editor/records',
    method: 'POST',
    isDefaultSearchParamsRequired: false,
    body: {
      _actionType: 'create',
      leader: LDR,
      fields,
      suppressDiscovery: false,
      marcFormat: 'BIBLIOGRAPHIC',
    },
  }).then(({ body }) => {
    recurse(
      () => {
        return cy.okapiRequest({
          method: 'GET',
          path: `records-editor/records/status?qmRecordId=${body.qmRecordId}`,
          isDefaultSearchParamsRequired: false,
        });
      },
      (response) => response.body.status === 'CREATED',
      {
        limit: 14,
        timeout: 80000,
        delay: 5000,
      },
    ).then((response) => {
      cy.wrap(response.body.externalId).as('createdMarcBibliographicId');

      return cy.get('@createdMarcBibliographicId');
    });
  });
});

Cypress.Commands.add('getHoldingNoteTypeIdViaAPI', (holdingNoteTypeName) => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: `holdings-note-types?query=(name=="${holdingNoteTypeName}")`,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => body.holdingsNoteTypes[0].id);
});

Cypress.Commands.add('getInstanceDateTypesViaAPI', (limit = 50) => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: `instance-date-types?limit=${limit}`,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ status, body }) => {
      return {
        status,
        instanceDateTypes: body.instanceDateTypes,
      };
    });
});

Cypress.Commands.add(
  'patchInstanceDateTypeViaAPI',
  (dateTypeId, keyToUpdate, value, ignoreErrors = false) => {
    const patchBody = {};
    patchBody[keyToUpdate] = value;
    return cy.okapiRequest({
      method: 'PATCH',
      path: `instance-date-types/${dateTypeId}`,
      body: patchBody,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
);

Cypress.Commands.add('getInventoryDisplaySettingsViaAPI', () => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'settings/entries',
      searchParams: {
        query: '(scope==ui-inventory.display-settings.manage and key==display-settings)',
      },
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => {
      return body.items;
    });
});

Cypress.Commands.add('updateInventoryDisplaySettingsViaAPI', (entryId, body) => {
  return cy.okapiRequest({
    method: 'PUT',
    path: `settings/entries/${entryId}`,
    body,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('setInventoryDisplaySettingsViaAPI', (body) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'settings/entries',
    body,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('setupInventoryDefaultSortViaAPI', (sortOption) => {
  cy.getInventoryDisplaySettingsViaAPI().then((entries) => {
    let updatedBody;
    if (entries.length) {
      updatedBody = { ...entries[0] };
      updatedBody.value.defaultSort = sortOption;
      cy.updateInventoryDisplaySettingsViaAPI(updatedBody.id, updatedBody);
    } else {
      updatedBody = { ...defaultDisplaySettings };
      updatedBody.id = uuid();
      updatedBody.value = {
        defaultSort: sortOption,
      };
      cy.setInventoryDisplaySettingsViaAPI(updatedBody);
    }
  });
});

Cypress.Commands.add('getLocSingleImportProfileViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'copycat/profiles',
  }).then(({ body }) => {
    return body.profiles.filter((profile) => profile.name === 'Library of Congress')[0];
  });
});

Cypress.Commands.add('toggleLocSingleImportProfileViaAPI', (enable = true) => {
  cy.getLocSingleImportProfileViaAPI().then((profile) => {
    if (profile.enabled !== enable) {
      const updatedprofile = { ...profile };
      updatedprofile.enabled = enable;
      cy.okapiRequest({
        method: 'PUT',
        path: `copycat/profiles/${profile.id}`,
        body: updatedprofile,
        isDefaultSearchParamsRequired: false,
      });
    }
  });
});

Cypress.Commands.add('getInstancesCountViaApi', (ignoreStaffSuppressed = true) => {
  const path = ignoreStaffSuppressed
    ? '/search/instances?query=staffSuppress==false&limit=1'
    : '/search/instances?query=(title all *)&limit=1';
  cy.okapiRequest({
    path,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.totalRecords;
  });
});

Cypress.Commands.add('getStatisticalCodes', (searchParams) => {
  cy.okapiRequest({
    path: 'statistical-codes',
    searchParams,
  }).then(({ body }) => {
    return body.statisticalCodes;
  });
});

Cypress.Commands.add('getStatisticalCodeTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'statistical-code-types',
    searchParams,
  }).then(({ body }) => {
    return body.statisticalCodeTypes;
  });
});

Cypress.Commands.add('getSingleImportProfilesViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'copycat/profiles',
  }).then(({ body }) => {
    return body.profiles;
  });
});

Cypress.Commands.add('getSubjectTypesViaApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'subject-types',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => {
      Cypress.env('subjectTypes', body.subjectTypes);
      return body.subjectTypes;
    });
});

Cypress.Commands.add('getAllModesOfIssuance', (searchParams) => {
  cy.okapiRequest({
    path: 'modes-of-issuance',
    searchParams,
  }).then(({ body }) => {
    return body.issuanceModes;
  });
});

Cypress.Commands.add('toggleLccnDuplicateCheck', ({ enable = true }) => {
  cy.okapiRequest({
    path: 'settings/entries',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    const targetEntry = body.items.find((entry) => entry.key === 'lccn-duplicate-check');
    if (targetEntry) {
      return cy.okapiRequest({
        method: 'PUT',
        path: `settings/entries/${targetEntry.id}`,
        isDefaultSearchParamsRequired: false,
        body: {
          ...targetEntry,
          value: { duplicateLccnCheckingEnabled: enable },
        },
      });
    } else {
      return cy.okapiRequest({
        method: 'POST',
        path: 'settings/entries',
        isDefaultSearchParamsRequired: false,
        body: {
          id: '497f6eca-6276-4993-bfeb-53cbbbba6f47',
          scope: 'ui-quick-marc.lccn-duplicate-check.manage',
          key: 'lccn-duplicate-check',
          value: { duplicateLccnCheckingEnabled: enable },
        },
      });
    }
  });
});

Cypress.Commands.add('batchCreateItemsViaApi', (items) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'item-storage/batch/synchronous',
    isDefaultSearchParamsRequired: false,
    body: { items },
  });
});

Cypress.Commands.add('batchUpdateItemsViaApi', (items) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'item-storage/batch/synchronous?upsert=true',
    isDefaultSearchParamsRequired: false,
    body: { items },
  });
});

Cypress.Commands.add('getRtacBatchViaApi', (instanceIds, fullPeriodicals = true) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'rtac-batch',
    body: {
      instanceIds: Array.isArray(instanceIds) ? instanceIds : [instanceIds],
      fullPeriodicals,
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getMarcRecordDataViaAPI', (recordId) => {
  cy.okapiRequest({
    path: `records-editor/records?externalId=${recordId}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('updateMarcRecordDataViaAPI', (parsedRecordId, updatedData) => {
  const body = updatedData;
  body._actionType = 'edit';
  return cy.okapiRequest({
    method: 'PUT',
    path: `records-editor/records/${parsedRecordId}`,
    isDefaultSearchParamsRequired: false,
    body,
  });
});

Cypress.Commands.add('getInstanceAuditDataViaAPI', (recordId) => {
  cy.okapiRequest({
    path: `audit-data/inventory/instance/${recordId}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('createMarcHoldingsViaAPI', (instanceId, fields) => {
  cy.okapiRequest({
    path: 'records-editor/records',
    method: 'POST',
    isDefaultSearchParamsRequired: false,
    body: {
      _actionType: 'create',
      externalId: instanceId,
      fields,
      leader: QuickMarcEditor.defaultValidHoldingsLdr,
      marcFormat: 'HOLDINGS',
      suppressDiscovery: false,
    },
  }).then(({ body }) => {
    recurse(
      () => {
        return cy.okapiRequest({
          method: 'GET',
          path: `records-editor/records/status?qmRecordId=${body.qmRecordId}`,
          isDefaultSearchParamsRequired: false,
        });
      },
      (response) => response.body.status === 'CREATED',
      {
        limit: 10,
        timeout: 80000,
        delay: 5000,
      },
    ).then((response) => {
      cy.wrap(response.body.externalId).as('createdMarcHoldingId');

      return cy.get('@createdMarcHoldingId');
    });
  });
});

Cypress.Commands.add('batchUpdateHoldingsViaApi', (holdingsRecords) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'holdings-storage/batch/synchronous?upsert=true',
    isDefaultSearchParamsRequired: false,
    body: { holdingsRecords },
  });
});

Cypress.Commands.add('resetInventoryDisplaySettingsViaAPI', () => {
  cy.getInventoryDisplaySettingsViaAPI().then((entries) => {
    if (entries.length) {
      const entryId = entries[0].id;
      cy.updateInventoryDisplaySettingsViaAPI(entryId, { ...defaultDisplaySettings, id: entryId });
    } else {
      cy.setInventoryDisplaySettingsViaAPI(defaultDisplaySettings);
    }
  });
});

Cypress.Commands.add('getInventoryInstanceById', (instanceId) => {
  return cy.okapiRequest({
    method: 'GET',
    path: `inventory/instances/${instanceId}`,
    isDefaultSearchParamsRequired: false,
  });
});
