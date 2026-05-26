// eslint-disable-next-line import/prefer-default-export
export const getFullName = (user) => {
  let fullName = user?.personal?.lastName ?? '';
  let givenName = user?.personal?.preferredFirstName ?? user?.personal?.firstName ?? '';
  const middleName = user?.personal?.middleName ?? '';
  if (middleName) {
    givenName += `${givenName ? ' ' : ''}${middleName}`;
  }

  if (givenName) {
    fullName += `${fullName ? ', ' : ''}${givenName}`;
  }

  return fullName;
};

export const buildPreRegistrationRecord = (
  baseRecordName,
  searchQuery,
  { label, phone, mobilePhone, preferredEmailCommunication, isEmailVerified },
) => {
  const normalizedLabel = label.toLowerCase();
  const addressLine0 = `${baseRecordName} ${label} Street`;

  return {
    status: 'TIER-2',
    isEmailVerified,
    generalInfo: {
      firstName: `${baseRecordName}_${label}_First`,
      lastName: `${baseRecordName}_${label}_Last`,
      middleName: `${baseRecordName}_${label}_Middle`,
      preferredFirstName: `${baseRecordName}_${label}_Preferred`,
    },
    addressInfo: {
      addressLine0,
      addressLine1: 'Suite 100',
      city: 'Metropolis',
      province: 'NY',
      zip: '12345',
      country: 'USA',
    },
    contactInfo: {
      phone,
      mobilePhone,
      email: `${searchQuery}.${normalizedLabel}@example.com`,
    },
    preferredEmailCommunication,
  };
};
