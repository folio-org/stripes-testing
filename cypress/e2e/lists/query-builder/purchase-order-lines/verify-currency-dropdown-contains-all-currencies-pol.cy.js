import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  purchaseOrderLinesFieldValues,
  QUERY_OPERATIONS,
  enumOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const listName = `AT_C451557_List_${getRandomPostfix()}`;
const expectedCurrencies = [
  'Afghan Afghani (AFN)',
  'Albanian Lek (ALL)',
  'Algerian Dinar (DZD)',
  'Angolan Kwanza (AOA)',
  'Arab Accounting Dinar (XAD)',
  'Argentine Peso (ARS)',
  'Armenian Dram (AMD)',
  'Aruban Florin (AWG)',
  'Australian Dollar (AUD)',
  'Azerbaijani Manat (AZN)',
  'Bahamian Dollar (BSD)',
  'Bahraini Dinar (BHD)',
  'Bangladeshi Taka (BDT)',
  'Barbadian Dollar (BBD)',
  'Belarusian Ruble (BYN)',
  'Belize Dollar (BZD)',
  'Bermudan Dollar (BMD)',
  'Bhutanese Ngultrum (BTN)',
  'Bolivian Boliviano (BOB)',
  'Bosnia-Herzegovina Convertible Mark (BAM)',
  'Botswanan Pula (BWP)',
  'Brazilian Real (BRL)',
  'British Pound (GBP)',
  'Brunei Dollar (BND)',
  'Bulgarian Lev (BGN)',
  'Burundian Franc (BIF)',
  'Cambodian Riel (KHR)',
  'Canadian Dollar (CAD)',
  'Cape Verdean Escudo (CVE)',
  'Caribbean Guilder (XCG)',
  'Cayman Islands Dollar (KYD)',
  'Central African CFA Franc (XAF)',
  'CFP Franc (XPF)',
  'Chilean Peso (CLP)',
  'Chinese Yuan (CNY)',
  'Colombian Peso (COP)',
  'Comorian Franc (KMF)',
  'Congolese Franc (CDF)',
  'Costa Rican Colón (CRC)',
  'Croatian Kuna (HRK)',
  'Cuban Peso (CUP)',
  'Czech Koruna (CZK)',
  'Danish Krone (DKK)',
  'Djiboutian Franc (DJF)',
  'Dominican Peso (DOP)',
  'East Caribbean Dollar (XCD)',
  'Egyptian Pound (EGP)',
  'Eritrean Nakfa (ERN)',
  'Ethiopian Birr (ETB)',
  'Euro (EUR)',
  'Falkland Islands Pound (FKP)',
  'Fijian Dollar (FJD)',
  'Gambian Dalasi (GMD)',
  'Georgian Lari (GEL)',
  'Ghanaian Cedi (GHS)',
  'Gibraltar Pound (GIP)',
  'Guatemalan Quetzal (GTQ)',
  'Guinean Franc (GNF)',
  'Guyanaese Dollar (GYD)',
  'Haitian Gourde (HTG)',
  'Honduran Lempira (HNL)',
  'Hong Kong Dollar (HKD)',
  'Hungarian Forint (HUF)',
  'Icelandic Króna (ISK)',
  'Indian Rupee (INR)',
  'Indonesian Rupiah (IDR)',
  'Iranian Rial (IRR)',
  'Iraqi Dinar (IQD)',
  'Israeli New Shekel (ILS)',
  'Jamaican Dollar (JMD)',
  'Japanese Yen (JPY)',
  'Jordanian Dinar (JOD)',
  'Kazakhstani Tenge (KZT)',
  'Kenyan Shilling (KES)',
  'Kuwaiti Dinar (KWD)',
  'Kyrgystani Som (KGS)',
  'Laotian Kip (LAK)',
  'Lebanese Pound (LBP)',
  'Lesotho Loti (LSL)',
  'Liberian Dollar (LRD)',
  'Libyan Dinar (LYD)',
  'Macanese Pataca (MOP)',
  'Macedonian Denar (MKD)',
  'Malagasy Ariary (MGA)',
  'Malawian Kwacha (MWK)',
  'Malaysian Ringgit (MYR)',
  'Maldivian Rufiyaa (MVR)',
  'Mauritanian Ouguiya (MRU)',
  'Mauritian Rupee (MUR)',
  'Mexican Peso (MXN)',
  'Moldovan Leu (MDL)',
  'Mongolian Tugrik (MNT)',
  'Moroccan Dirham (MAD)',
  'Mozambican Metical (MZN)',
  'Myanmar Kyat (MMK)',
  'Namibian Dollar (NAD)',
  'Nepalese Rupee (NPR)',
  'Netherlands Antillean Guilder (ANG)',
  'New Taiwan Dollar (TWD)',
  'New Zealand Dollar (NZD)',
  'Nicaraguan Córdoba (NIO)',
  'Nigerian Naira (NGN)',
  'North Korean Won (KPW)',
  'Norwegian Krone (NOK)',
  'Omani Rial (OMR)',
  'Pakistani Rupee (PKR)',
  'Panamanian Balboa (PAB)',
  'Papua New Guinean Kina (PGK)',
  'Paraguayan Guarani (PYG)',
  'Peruvian Sol (PEN)',
  'Polish Zloty (PLN)',
  'Qatari Riyal (QAR)',
  'Romanian Leu (RON)',
  'Russian Ruble (RUB)',
  'Rwandan Franc (RWF)',
  'Salvadoran Colón (SVC)',
  'Samoan Tala (WST)',
  'São Tomé & Príncipe Dobra (STN)',
  'Saudi Riyal (SAR)',
  'Serbian Dinar (RSD)',
  'Seychellois Rupee (SCR)',
  'Singapore Dollar (SGD)',
  'Solomon Islands Dollar (SBD)',
  'Somali Shilling (SOS)',
  'South African Rand (ZAR)',
  'South Korean Won (KRW)',
  'South Sudanese Pound (SSP)',
  'Sri Lankan Rupee (LKR)',
  'St. Helena Pound (SHP)',
  'Sudanese Pound (SDG)',
  'Surinamese Dollar (SRD)',
  'Swazi Lilangeni (SZL)',
  'Swedish Krona (SEK)',
  'Swiss Franc (CHF)',
  'Syrian Pound (SYP)',
  'Tajikistani Somoni (TJS)',
  'Tanzanian Shilling (TZS)',
  'Thai Baht (THB)',
  'Tongan Paʻanga (TOP)',
  'Trinidad & Tobago Dollar (TTD)',
  'Tunisian Dinar (TND)',
  'Turkish Lira (TRY)',
  'Turkmenistani Manat (TMT)',
  'Ugandan Shilling (UGX)',
  'Ukrainian Hryvnia (UAH)',
  'United Arab Emirates Dirham (AED)',
  'Uruguayan Peso (UYU)',
  'US Dollar (USD)',
  'Uzbekistani Som (UZS)',
  'Vanuatu Vatu (VUV)',
  'Venezuelan Bolívar (VES)',
  'Vietnamese Dong (VND)',
  'West African CFA Franc (XOF)',
  'Yemeni Rial (YER)',
  'Zambian Kwacha (ZMW)',
  'Zimbabwe Gold (ZWG)',
  'Zimbabwean Dollar (2009) (ZWL)',
];
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Purchase order lines', () => {
      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        if (user?.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        "C451557 Verify that the 'POL currency' dropdown contains all possible currencies (athena)",
        { tags: ['extendedPath', 'athena', 'C451557'] },
        () => {
          // Step 1: Create new list with Purchase order lines record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Build query
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Select "POL — Cost currency" field, "not equal to" operator, and verify Value dropdown
          QueryModal.selectField(purchaseOrderLinesFieldValues.costCurrency);
          QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.costCurrency);
          QueryModal.verifyQueryAreaContent('');

          QueryModal.verifyOperatorsList(enumOperators);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.verifyQueryAreaContent('(pol.cost_currency != )');

          // Verify the Value dropdown contains all expected currencies
          QueryModal.verifyOptionsInValueSelect(expectedCurrencies);
        },
      );
    });
  });
});
