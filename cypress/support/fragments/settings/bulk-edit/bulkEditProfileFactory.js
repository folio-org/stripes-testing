/**
 * Bulk Edit Profile Factory
 *
 * The factory creates payload objects for POST requests to create bulk edit profiles
 * in Settings -> Bulk edit section of the FOLIO system.
 *
 * The factory is organized into:
 * - Main factory function (createBulkEditProfileBody)
 * - Action type constants (centralized for easy maintenance)
 * - Common rule creators (applicable to multiple entity types)
 * - Entity-specific rule creators (Holdings, Instances, Items, Users)
 */

// Bulk Edit API Action Type Constants
export const BULK_EDIT_ACTION_TYPES = {
  // Text/String operations
  FIND_AND_REPLACE: 'FIND_AND_REPLACE',
  FIND_AND_REMOVE_THESE: 'FIND_AND_REMOVE_THESE',
  REPLACE_WITH: 'REPLACE_WITH',
  CLEAR_FIELD: 'CLEAR_FIELD',

  // Note operations
  ADD_TO_EXISTING: 'ADD_TO_EXISTING',
  REMOVE_ALL: 'REMOVE_ALL',
  REMOVE_SOME: 'REMOVE_SOME',
  MARK_AS_STAFF_ONLY: 'MARK_AS_STAFF_ONLY',
  REMOVE_MARK_AS_STAFF_ONLY: 'REMOVE_MARK_AS_STAFF_ONLY',
  CHANGE_TYPE: 'CHANGE_TYPE',

  // Boolean operations
  SET_TO_TRUE: 'SET_TO_TRUE',
  SET_TO_FALSE: 'SET_TO_FALSE',
};

// Common action creators for frequently used patterns
export const ActionCreators = {
  findAndReplace: (initial, updated) => ({
    type: BULK_EDIT_ACTION_TYPES.FIND_AND_REPLACE,
    initial,
    updated,
  }),

  findAndRemove: (initial) => ({
    type: BULK_EDIT_ACTION_TYPES.FIND_AND_REMOVE_THESE,
    initial,
  }),

  replaceWith: (value) => ({
    type: BULK_EDIT_ACTION_TYPES.REPLACE_WITH,
    updated: value,
  }),

  clearField: () => ({
    type: BULK_EDIT_ACTION_TYPES.CLEAR_FIELD,
  }),

  removeAll: (parameters = null) => ({
    type: BULK_EDIT_ACTION_TYPES.REMOVE_ALL,
    parameters,
  }),

  removeSome: (value) => ({
    type: BULK_EDIT_ACTION_TYPES.REMOVE_SOME,
    updated: value,
  }),

  addToExisting: (value, parameters = null) => ({
    type: BULK_EDIT_ACTION_TYPES.ADD_TO_EXISTING,
    updated: value,
    parameters,
  }),

  markAsStaffOnly: (staffOnly = true) => ({
    type: BULK_EDIT_ACTION_TYPES.MARK_AS_STAFF_ONLY,
    parameters: [
      {
        key: 'STAFF_ONLY',
        value: staffOnly,
      },
    ],
  }),

  removeMarkAsStaffOnly: () => ({
    type: BULK_EDIT_ACTION_TYPES.REMOVE_MARK_AS_STAFF_ONLY,
  }),

  setToFalse: () => ({
    type: BULK_EDIT_ACTION_TYPES.SET_TO_FALSE,
  }),

  changeType: (value) => ({
    type: BULK_EDIT_ACTION_TYPES.CHANGE_TYPE,
    updated: value,
  }),
};

// MARC action creators for common MARC operations
export const MarcActionCreators = {
  find: (value) => ({
    name: 'FIND',
    data: [
      {
        key: 'VALUE',
        value,
      },
    ],
  }),

  append: (subfield, value) => ({
    name: 'APPEND',
    data: [
      {
        key: 'SUBFIELD',
        value: subfield,
      },
      {
        key: 'VALUE',
        value,
      },
    ],
  }),

  removeAll: () => ({
    name: 'REMOVE_ALL',
    data: [],
  }),

  addToExisting: (value) => ({
    name: 'ADD_TO_EXISTING',
    data: [
      {
        key: 'VALUE',
        value,
      },
    ],
  }),

  replaceWith: (value) => ({
    name: 'REPLACE_WITH',
    data: [
      {
        key: 'VALUE',
        value,
      },
    ],
  }),
};

// Main factory function to create bulk edit profile bodies
export const createBulkEditProfileBody = (config) => {
  const profile = {
    name: config.name,
    description: config.description,
    locked: config.locked || false,
    entityType: config.entityType,
    ruleDetails: config.ruleDetails,
    marcRuleDetails: config.marcRuleDetails,
  };

  return profile;
};

// Common rule creators (applicable to multiple entity types)
export const createAdminNoteRule = (action) => ({
  option: 'ADMINISTRATIVE_NOTE',
  actions: [action],
});

export const createSuppressFromDiscoveryRule = (
  setToFalse = true,
  applyToItems = null,
  applyToHoldings = null,
) => {
  let actionType;
  if (setToFalse) {
    actionType = BULK_EDIT_ACTION_TYPES.SET_TO_FALSE;
  } else {
    actionType = BULK_EDIT_ACTION_TYPES.SET_TO_TRUE;
  }

  let parameters = null;
  if (applyToItems !== null || applyToHoldings !== null) {
    parameters = [];
    if (applyToHoldings !== null) {
      parameters.push({
        key: 'APPLY_TO_HOLDINGS',
        value: applyToHoldings,
      });
    }
    if (applyToItems !== null) {
      parameters.push({
        key: 'APPLY_TO_ITEMS',
        value: applyToItems,
      });
    }
  }

  return {
    option: 'SUPPRESS_FROM_DISCOVERY',
    actions: [
      {
        type: actionType,
        parameters,
      },
    ],
  };
};

// Holdings-specific rule creators
export const HoldingsRules = {
  createElectronicAccessRule: (action) => ({
    option: 'ELECTRONIC_ACCESS_MATERIALS_SPECIFIED',
    actions: [action],
  }),

  createHoldingsNoteRule: (noteText, noteTypeId = null, staffOnly = false) => ({
    option: 'HOLDINGS_NOTE',
    actions: [
      {
        type: BULK_EDIT_ACTION_TYPES.ADD_TO_EXISTING,
        updated: noteText,
        parameters: [
          {
            key: 'HOLDINGS_NOTE_TYPE_ID_KEY',
            value: noteTypeId,
          },
          {
            key: 'STAFF_ONLY',
            value: staffOnly,
          },
        ],
      },
    ],
  }),

  createTemporaryLocationRule: (action) => ({
    option: 'TEMPORARY_LOCATION',
    actions: [{ type: action }],
  }),

  createPermanentLocationRule: (action, locationId = null) => ({
    option: 'PERMANENT_LOCATION',
    actions: [
      {
        ...action,
        updated: locationId !== null ? locationId : action.updated,
      },
    ],
  }),

  createElectronicAccessLinkTextRule: (action, linkText = null) => ({
    option: 'ELECTRONIC_ACCESS_LINK_TEXT',
    actions: [
      {
        ...action,
        updated: linkText !== null ? linkText : action.updated,
      },
    ],
  }),

  createMarkAsStaffOnlyRule: (noteTypeId = null) => ({
    option: 'HOLDINGS_NOTE',
    actions: [
      {
        type: BULK_EDIT_ACTION_TYPES.MARK_AS_STAFF_ONLY,
        parameters: [
          {
            key: 'HOLDINGS_NOTE_TYPE_ID_KEY',
            value: noteTypeId,
          },
        ],
      },
    ],
  }),

  createRemoveMarkAsStaffOnlyRule: (noteTypeId = null) => ({
    option: 'HOLDINGS_NOTE',
    actions: [
      {
        type: BULK_EDIT_ACTION_TYPES.REMOVE_MARK_AS_STAFF_ONLY,
        parameters: [
          {
            key: 'HOLDINGS_NOTE_TYPE_ID_KEY',
            value: noteTypeId,
          },
        ],
      },
    ],
  }),
};

// Instance-specific rule creators
export const InstancesRules = {
  createInstanceNoteRule: (action, noteTypeId = null) => {
    // Always create parameters array for dynamic ID assignment
    // The noteTypeId will be set after profile creation
    const parameters = [
      {
        key: 'INSTANCE_NOTE_TYPE_ID_KEY',
        value: noteTypeId,
      },
    ];

    return {
      option: 'INSTANCE_NOTE',
      actions: [
        {
          ...action,
          parameters,
        },
      ],
    };
  },

  createStatisticalCodeRule: (action, codeId = null) => ({
    option: 'STATISTICAL_CODE',
    actions: [
      {
        ...action,
        updated: codeId !== null ? codeId : action.updated,
      },
    ],
  }),

  createStaffSuppressRule: (setToTrue = true) => ({
    option: 'STAFF_SUPPRESS',
    actions: [
      {
        type: setToTrue ? BULK_EDIT_ACTION_TYPES.SET_TO_TRUE : BULK_EDIT_ACTION_TYPES.SET_TO_FALSE,
      },
    ],
  }),
};

// Items-specific rule creators
export const ItemsRules = {
  createItemStatusRule: (action, statusId = null) => ({
    option: 'ITEM_STATUS',
    actions: [
      {
        type: action,
        updated: statusId,
      },
    ],
  }),

  createItemNoteRule: (action, noteTypeId = null, staffOnly = false) => {
    let parameters;
    if (action.type === BULK_EDIT_ACTION_TYPES.ADD_TO_EXISTING) {
      parameters = [
        {
          key: 'ITEM_NOTE_TYPE_ID_KEY',
          value: noteTypeId,
        },
        {
          key: 'STAFF_ONLY',
          value: staffOnly,
        },
      ];
    } else if (action.type === BULK_EDIT_ACTION_TYPES.REMOVE_ALL) {
      parameters = [
        {
          key: 'ITEM_NOTE_TYPE_ID_KEY',
          value: noteTypeId,
        },
      ];
    } else if (action.type === BULK_EDIT_ACTION_TYPES.MARK_AS_STAFF_ONLY) {
      parameters = [
        {
          key: 'ITEM_NOTE_TYPE_ID_KEY',
          value: noteTypeId,
        },
        {
          key: 'STAFF_ONLY',
          value: false,
          onlyForActions: ['ADD_TO_EXISTING'],
        },
      ];
    } else if (action.type === BULK_EDIT_ACTION_TYPES.REMOVE_MARK_AS_STAFF_ONLY) {
      parameters = [
        {
          key: 'STAFF_ONLY',
          value: false,
          onlyForActions: ['ADD_TO_EXISTING'],
        },
      ];
    } else {
      parameters = action.parameters;
    }

    return {
      option: 'ITEM_NOTE',
      actions: [
        {
          ...action,
          parameters,
        },
      ],
    };
  },

  createPermanentLoanTypeRule: (action, loanTypeId = null) => ({
    option: 'PERMANENT_LOAN_TYPE',
    actions: [
      {
        ...action,
        updated: loanTypeId !== null ? loanTypeId : action.updated,
      },
    ],
  }),

  createTemporaryLoanTypeRule: (action, loanTypeId = null) => ({
    option: 'TEMPORARY_LOAN_TYPE',
    actions: [
      {
        ...action,
        updated: loanTypeId !== null ? loanTypeId : action.updated,
      },
    ],
  }),

  createPermanentLocationRule: (action, locationId = null) => ({
    option: 'PERMANENT_LOCATION',
    actions: [
      {
        ...action,
        updated: locationId !== null ? locationId : action.updated,
      },
    ],
  }),

  createTemporaryLocationRule: (action, locationId = null) => ({
    option: 'TEMPORARY_LOCATION',
    actions: [
      {
        ...action,
        updated: locationId !== null ? locationId : action.updated,
      },
    ],
  }),

  createElectronicAccessRule: (action, uri = null) => ({
    option: 'ELECTRONIC_ACCESS',
    actions: [
      {
        ...action,
        updated: uri !== null ? uri : action.updated,
      },
    ],
  }),

  createCheckInNoteRule: (action, noteTypeId = null, staffOnly = false) => {
    const parameters = [
      {
        key: 'STAFF_ONLY',
        value: staffOnly,
        onlyForActions: ['ADD_TO_EXISTING'],
      },
    ];

    return {
      option: 'CHECK_IN_NOTE',
      actions: [
        {
          ...action,
          updated: noteTypeId !== null ? noteTypeId : action.updated,
          parameters,
        },
      ],
    };
  },

  createCheckOutNoteRule: (action, staffOnly = false) => ({
    option: 'CHECK_OUT_NOTE',
    actions: [
      {
        ...action,
        parameters: [
          {
            key: 'STAFF_ONLY',
            value: staffOnly,
            onlyForActions: ['ADD_TO_EXISTING'],
          },
        ],
      },
    ],
  }),

  createStatusRule: (action, statusName = null) => ({
    option: 'STATUS',
    actions: [
      {
        ...action,
        updated: statusName !== null ? statusName : action.updated,
      },
    ],
  }),
};

// Users-specific rule creators
export const UsersRules = {
  createEmailAddressRule: (action, value = null) => ({
    option: 'EMAIL_ADDRESS',
    actions: [value !== null ? { ...action, updated: value } : { ...action }],
  }),

  createPatronGroupRule: (action, value = null) => ({
    option: 'PATRON_GROUP',
    actions: [value !== null ? { ...action, updated: value } : { ...action }],
  }),

  createExpirationDateRule: (action, value = null) => ({
    option: 'EXPIRATION_DATE',
    actions: [value !== null ? { ...action, updated: value } : { ...action }],
  }),
};

// MARC-specific rule creators for MARC bibliographic records
export const MarcRules = {
  createMarcFieldRule: (tag, ind1, ind2, subfield, actions) => ({
    tag,
    ind1,
    ind2,
    subfield,
    actions,
  }),

  createMarcAction: (name, data = []) => ({
    name,
    data,
  }),

  createMarcData: (key, value) => ({
    key,
    value,
  }),
};
