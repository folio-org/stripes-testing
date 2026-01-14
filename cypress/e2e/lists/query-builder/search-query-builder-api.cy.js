/* eslint-disable dot-notation */
import { validate } from 'jsonschema';
import budgetsSchema from '../../../jsonSchemas/budgetsSchema';
import fundsSchema from '../../../jsonSchemas/fundsSchema';
import invoiceLinesSchema from '../../../jsonSchemas/invoiceLinesSchema';
import purchaseOrderLinesSchema from '../../../jsonSchemas/purchaseOrderLinesSchema';
import purchaseOrderLinesWithTitlesSchema from '../../../jsonSchemas/purchaseOrderLinesWithTitlesSchema';
import transactionsSchema from '../../../jsonSchemas/transactionsSchema';
import organizationsSchema from '../../../jsonSchemas/organizationsSchema';
import voucherLinesWithFundSchema from '../../../jsonSchemas/voucherLinesWithFundSchema';
import voucherLinesWithInvoiceFundOrganizationSchema from '../../../jsonSchemas/voucherLinesWithInvoiceFundOrganizationSchema';
import vouchersSchema from '../../../jsonSchemas/vouchersSchema';
import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import Users from '../../../support/fragments/users/users';


describe('Lists', () => {
  describe('Query Builder API', () => {
    let version;
    let typeData;
    let userData = {};
    let recordTypeId;
    before('Get version', () => {
      cy.getAdminToken();
      Lists.getVersionApi().then((vrs) => {
        version = vrs;
      });
    });

    const getValues = (fieldName, labelName) => {
      const entityTypeId = typeData.columns.find((column) => column.name === fieldName).source.entityTypeId;
      return Lists.getEntityTypeColumnsViaApi(entityTypeId, labelName).then((body) => {
        return body.content;
      });
    };

    const getAllValues = (fieldName, labelName) => {
      return getValues(fieldName, labelName).then((items) => {
        const values = items.map((item) => item.value);
        const labels = items.map((item) => item.label);
        return cy.wrap({ values, labels });
      });
    };

    const getFilteredValues = (fieldName, labelName, [labels]) => {
      return getValues(fieldName, labelName).then((content) => {
        const filteredValues = content.filter((item) => labels.includes(item.label)).map((item) => item.value);
        return cy.wrap({ values: filteredValues });
      });
    };

    const validateResponse = (fullFqlQuery, schema) => {
      fullFqlQuery._version = version;
      const query = {
        entityTypeId: recordTypeId,
        fqlQuery: JSON.stringify(fullFqlQuery),
      };
      return cy.wrap(query).then(() => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          Lists.getQueryViaApi(createdQuery.queryId, { includeResults: true, offset: 0, limit: 10 }).then((queryResponse) => {
            expect(queryResponse.status).to.eq(200);
            const result = validate(queryResponse.body, schema, { base: 'http://example.com/' });
            cy.wrap(result).then(() => {
              expect(result.valid, result.errors.toString()).to.be.equal(true);

              return queryResponse.body;
            });
          });
        });
      });
    };

    describe('Organizations', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Organizations').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C451508 Search for "Organizations" in the query builder using "Organization — EDI vendor code" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451508'] },
        () => {
          const fqlQuery = { 'organization.edi_vendor_edi_code': { '$empty': true } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, organizationsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['organization.edi_vendor_edi_code']).to.be.equal(null);
              });
            });
          });
        });

      it('C451509 Search for "Organizations" in the query builder using "Organization updated by — Username" field (corsair)',
        { tags: ['extendedPath', 'corsair', 'C451509'] },
        () => {
          const fqlQuery = { 'updated_by.username': { '$ne': 'test' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, organizationsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['updated_by.username']).to.not.be.equal('test');
              });
            });
          });
        });

      it('C451516 Search for "Organizations" in the query builder using "Organization — Name" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451516'] },
        () => {
          const fqlQuery = { 'organization.name': { '$empty': false } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, organizationsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['organization.name']).to.not.be.equal(null);
              });
            });
          });
        });

      it('C451518 C451517 Search for "organizations - vendor info" in the query builder using "Discount percent" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451518', 'C451517'] },
        () => {
          const fqlQuery = { 'organization.is_vendor': { '$eq': 'true' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, organizationsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['organization.is_vendor']).to.be.equal('true');
              });
            });
          });
        });

      it('C451524 C451523 Search for organizations in the query builder using "Orgs — Is donor" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451524', 'C451523'] },
        () => {
          const fqlQuery = { 'organization.is_donor': { '$eq': 'false' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, organizationsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['organization.is_donor']).to.be.equal('false');
              });
            });
          });
        });

      it('C451525 C451532 Search for "organizations" in the query builder using "Code" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451525', 'C451532'] },
        () => {
          const fqlQuery = { 'organization.code': { '$empty': false } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, organizationsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['organization.code']).to.not.be.equal(null);
              });
            });
          });
        });
    });

    describe.only('Purchase order lines', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.usersViewRequests.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.loansAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Purchase order lines with titles').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C436901 Search purchase order lines in the Query Builder using "PO — Order type" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C436901'] },
        () => {
          const fqlQuery = { 'po.order_type': { '$eq': 'One-Time' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['po.order_type']).to.be.equal('One-Time');
              });
            });
          });
        });

      it('C440056 Search purchase order lines in the Query Builder using "PO — Approved" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C440056'] },
        () => {
          const fqlQuery = { 'po.approved': { '$eq': 'true' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['po.approved']).to.be.equal('true');
              });
            });
          });
        });

      it('C440057 Search purchase order lines in the Query Builder using "PO assigned to user — Last name, first name" type (corsair)',
        { tags: ['extendedPath', 'corsair', 'C440057'] },
        () => {
          const fqlQuery = { 'assigned_to_user.last_name_first_name': { '$empty': true } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                if (item['assigned_to_user.last_name_first_name'] !== null) {
                  expect(item['assigned_to_user.last_name_first_name']).to.be.equal('');
                } else {
                  expect(item['assigned_to_user.last_name_first_name']).to.be.equal(null);
                }
              });
            });
          });
        });

      it('C440058 Search purchase order lines in the Query Builder using "POL — Cost PO line estimated price" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C440058'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'pol.cost_po_line_estimated_price': { '$gte': '0' } },
              { 'pol.cost_po_line_estimated_price': { '$lte': '1000' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['pol.cost_po_line_estimated_price'] >= 0).to.be.equal(true);
                expect(item['pol.cost_po_line_estimated_price'] <= 1000).to.be.equal(true);
              });
            });
          });
        });

      it('C442845 Search purchase order lines in the Query Builder using "POL exchange rate" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C442845'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'pol_exchange_rate': { '$gte': '0' } },
              { 'pol_exchange_rate': { '$lte': '1000' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['pol_exchange_rate'] >= 0).to.be.equal(true);
                expect(item['pol_exchange_rate'] <= 1000).to.be.equal(true);
              });
            });
          });
        });

      it('C442846 Search purchase order lines in the Query Builder using "PO — PO number" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C442846'] },
        () => {
          const fqlQuery = { 'po.po_number': { '$contains': '1' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['po.po_number'].includes('1')).to.be.equal(true);
              });
            });
          });
        });

      it('C442847 Search purchase order lines in the Query Builder using "POL — Payment status" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C442847'] },
        () => {
          const fqlQuery = { 'pol.payment_status': { '$ne': 'Cancelled' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['pol.payment_status']).to.not.be.equal('Cancelled');
              });
            });
          });
        });

      it('C442848 Search purchase order lines in the Query Builder using "PO — Updated at" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C442848'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'po.updated_at': { '$gt': '2020-01-01T00:00:00.000' } },
              { 'po.updated_at': { '$lt': '2040-01-01T00:00:00.000' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(new Date(item['po.updated_at'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(new Date(item['po.updated_at'])).to.be.lessThan(new Date('2040-01-01T00:00:00.000'));
              });
            });
          });
        });
    });

    describe('Purchase order lines with titles', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        Lists.getTypeIdByNameViaApi('Purchase order lines with titles').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      it('C688805 Search for "Purchase orders with titles" in the query builder using the fields "Created by user — Username", "Instance — Instance HRID", "Instance — Format names", "PO — Workflow status (corsair)',
        { tags: ['extendedPath', 'corsair', 'C688805'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'created_by_user.username': { '$ne': 'test' } },
              { 'instance.hrid': { '$contains': 'in' } },
              { 'instance.format_names': { '$empty': true } },
              { 'purchase_order.workflow_status': { '$eq': 'Open' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesWithTitlesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['created_by_user.username']).to.not.be.equal('test');
                expect(item['instance.hrid'].includes('in')).to.be.equal(true);
                expect(item['instance.format_names']).to.be.equal(null);
                expect(item['purchase_order.workflow_status']).to.be.equal('Open');
              });
            });
          });
        });

      it('C688805 Search for "Purchase order lines with titles" in the query builder using the fields "Instance — Languages" ,"Organization — Code", "Organization — UUID" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C688805'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'instance.languages': { '$empty': true } },
              { 'organization.code': { '$empty': false } },
              { 'organization.id': { '$nin': ['12345'] } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesWithTitlesSchema).then((body) => {
              body.content.forEach((item) => {
                if (item['instance.languages'] !== null) {
                  expect(item['instance.languages']).to.deep.equal([]);
                }
                expect(item['organization.code']).to.not.be.equal(null);
                expect(['12345'].includes(item['organization.id'])).to.be.equal(false);
              });
            });
          });
        });

      it('C688748 Search for "Purchase order lines with titles" in the query builder using the fields Created by user — Email, Organization — EDI vendor type and POL — Created at (corsair)',
        { tags: ['criticalPath', 'corsair', 'C688748'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'created_by_user.email': { '$ne': 'test' } },
              { 'pol.created_at': { '$gt': '2020-01-01T00:00:00.000' } },
              { 'organization.edi_vendor_edi_type': { '$empty': true } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, purchaseOrderLinesWithTitlesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['created_by_user.email']).to.not.be.equal('test');
                expect(new Date(item['pol.created_at'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(item['organization.edi_vendor_edi_type']).to.be.equal(null);
              });
            });
          });
        });
    });

    describe('Vouchers', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Vouchers').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C692068 Search for "Vouchers" in the query builder using the fields "Voucher — Enclosure needed", "Name" and "Voucher — Updated date" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692068'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.enclosure_needed': { '$ne': 'true' } },
              { 'voucher.updated_date': { '$gt': '2020-01-01T00:00:00.000' } },
              { 'vendor.name': { '$empty': false } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, vouchersSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher.enclosure_needed']).to.not.be.equal('true');
                expect(new Date(item['voucher.updated_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(item['vendor.name']).to.not.be.equal(null);
              });
            });
          });
        });

      it('C692063 Search for "Vouchers" in the query builder using the fields "Voucher — Acquisition unit names", "Voucher — Disbursement amount", "Voucher — UUID" and "Voucher — Created date" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692063'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.disbursement_amount': { '$ne': '10' } },
              { 'voucher.id': { '$nin': ['1'] } },
              { 'voucher.created_date': { '$gt': '2020-01-01T00:00:00.000' } },
            ]
          };

          getFilteredValues('voucher.acquisition_units', 'name', ['main']).then(({ values }) => {
            const obj = {
              'voucher.acquisition_units': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, vouchersSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher.disbursement_amount']).to.not.be.equal('10');
                expect(['1'].includes(item['voucher.id'])).to.be.equal(false);
                expect(new Date(item['voucher.created_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                if (item['voucher.acquisition_units']) {
                  expect(['main'].includes(item['voucher.acquisition_units'])).to.be.equal(false);
                }
              });
            });
          });
        });
    });

    describe('Invoice lines', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Invoice lines').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C692062 Search for "Invoice lines" in the query builder using the fields "Invoice — Check subscription overlap", "Invoice — Enclosure needed" and "Invoice — Export to accounting" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692062'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice.chk_subscription_overlap': { '$ne': 'true' } },
              { 'invoice.enclosure_needed': { '$eq': 'false' } },
              { 'invoice.export_to_accounting': { '$ne': 'false' } },
            ]
          };
          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, invoiceLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['invoice.chk_subscription_overlap']).to.not.be.equal('true');
                expect(item['invoice.enclosure_needed']).to.be.equal('false');
                expect(item['invoice.export_to_accounting']).to.not.be.equal('false');
              });
            });
          });
        });

      it('C692061 Search for "Invoice lines" in the query builder using the fields "Invoice — Note", "Invoice — Payment method", "Invoice lines — Account number", and "Invoice — Folio invoice number" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692061'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice.note': { '$ne': 'test' } },
              { 'invoice.payment_method': { '$contains': 'a' } },
              { 'invoice_line.account_number': { '$ne': '1' } },
              { 'invoice.folio_invoice_no': { '$ne': '1' } },
            ]
          };
          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, invoiceLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['invoice.note']).to.not.be.equal('test');
                expect(item['invoice.payment_method'].includes('a')).to.be.equal(true);
                expect(item['invoice_line.account_number']).to.not.be.equal('1');
                expect(item['invoice.folio_invoice_no']).to.not.be.equal('1');
              });
            });
          });
        });

      it('C692060 Search for "Invoice lines" in the query builder using the fields "Invoice — Payment due", "Invoice lines — Total adjustments", "Invoice lines — Sub-total", and "Invoice — Invoice date" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692060'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice.payment_due': { '$empty': true } },
              { 'invoice_line.adjustments_total': { '$lte': '100000' } },
              { 'invoice_line.sub_total': { '$lte': '100000' } },
              { 'invoice.invoice_date': { '$lt': '2040-01-01T00:00:00.000' } },
            ]
          };
          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, invoiceLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['invoice.payment_due']).to.be.equal(null);
                expect(item['invoice_line.adjustments_total'] <= 100000).to.be.equal(true);
                expect(item['invoice_line.sub_total'] <= 100000).to.be.equal(true);
                expect(new Date(item['invoice.invoice_date'])).to.be.lessThan(new Date('2040-01-01T00:00:00.000'));
              });
            });
          });
        });

      it('C692059 Search for "Invoice lines" in the query builder using the fields "Invoice — Vendor name", "Invoice — Batch group", "Invoice — Source" and "Invoice — Fiscal year" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692059'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice.source': { '$in': ['API', 'EDI'] } },
            ]
          };
          getAllValues('invoice.vendor_name', 'name').then(({ values }) => {
            const obj = {
              'invoice.vendor_name': {
                '$in': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            getFilteredValues('invoice.batch_group', 'batch_group', ['Amherst (AC)', 'FOLIO']).then(({ values }) => {
              const obj = {
                'invoice.batch_group': {
                  '$in': values
                }
              };
              fqlQuery.$and.push(obj);
            }).then(() => {
              validateResponse(fqlQuery, invoiceLinesSchema).then((body) => {
                body.content.forEach((item) => {
                  expect(['Amherst (AC)', 'FOLIO'].includes(item['invoice.batch_group'])).to.be.equal(true);
                  expect(['API', 'EDI'].includes(item['invoice.source'])).to.be.equal(true);
                });
              });
            });
          });
        });

      it('C692058 Search for "Invoice lines" in the query builder using the fields "Acquisition unit names" , "Invoice lines — UUID" and "Invoice — Approved date" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692058'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice_line.id': { '$empty': false } },
              { 'invoice.approval_date': { '$gte': '2020-01-01T00:00:00.000' } },
            ]
          };

          getFilteredValues('invoice.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'invoice.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, invoiceLinesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['invoice_line.id']).to.not.be.equal(null);
                expect(new Date(item['invoice.approval_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                if (item['invoice.acquisition_unit']) {
                  expect(['main'].includes(item['invoice.acquisition_unit'])).to.be.equal(false);
                }
              });
            });
          });
        });
    });

    describe('Voucher lines with fund', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiFinanceViewEditDeleteFundBudget.gui,
          Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Voucher lines with fund').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C692047 Search for "Voucher lines with fund" in the query builder using the fields "Voucher — Exchange rate" and "Voucher — Total" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692047'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.enclosure_needed': { '$eq': 'false' } },
              { 'voucher.export_to_accounting': { '$ne': 'false' } },
              { 'voucher.account_no': { '$empty': true } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithFundSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher.enclosure_needed']).to.be.equal('false');
                expect(item['voucher.export_to_accounting']).to.not.be.equal('false');
                expect(item['voucher.account_no']).to.be.equal(null);
              });
            });
          });
        });

      it('C692048 Search for "Voucher lines with fund" in the query builder using the fields "Voucher — Enclosure needed", "Voucher — Export to accounting", "Voucher — Account number", "Fund with ledger — Ledger — Fiscal year one" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692048'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.exchange_rate': { '$lte': '100000' } },
              { 'voucher.amount': { '$lte': '100000' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithFundSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher.exchange_rate'] <= 100000).to.be.equal(true);
                expect(item['voucher.amount'] <= 100000).to.be.equal(true);
              });
            });
          });
        });

      it('C689202 Search for "Voucher lines with fund" in the query builder using the fields "Voucher — Created date", " Voucher — Disbursement date" , "Voucher — Voucher date", "Ledger — UUID" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C689202'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.created_date': { '$gte': '2020-01-01T00:00:00.000' } },
              { 'voucher.voucher_date': { '$lte': '2040-01-01T00:00:00.000' } },
              { 'voucher.disbursement_date': { '$empty': true } },
              { 'ledger.id': { '$empty': false } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithFundSchema).then((body) => {
              body.content.forEach((item) => {
                expect(new Date(item['voucher.created_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(new Date(item['voucher.voucher_date'])).to.be.lessThan(new Date('2040-01-01T00:00:00.000'));
                expect(item['voucher.disbursement_date']).to.be.equal(null);
                expect(item['ledger.id']).to.not.be.equal(null);
              });
            });
          });
        });

      it('C689201 Search for "Voucher lines with fund" in the query builder using the fields "Voucher — Type", "Voucher — Batch group", "Fund — Acquisition unit names", "Fund — Status" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C689201'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.type': { '$in': ['Payment', 'Credit', 'Pre-payment', 'Voucher'] } },
              { 'fund.fund_status': { '$in': ['Active'] } },
            ]
          };

          getFilteredValues('fund.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'fund.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            getFilteredValues('voucher.batch_group', 'batch_group', ['Amherst (AC)', 'FOLIO']).then(({ values }) => {
              const obj = {
                'voucher.batch_group': {
                  '$in': values
                }
              };
              fqlQuery.$and.push(obj);
            }).then(() => {
              validateResponse(fqlQuery, voucherLinesWithFundSchema).then((body) => {
                body.content.forEach((item) => {
                  expect(['Payment', 'Credit', 'Pre-payment', 'Voucher'].includes(item['voucher.type'])).to.be.equal(true);
                  expect(['Amherst (AC)', 'FOLIO'].includes(item['voucher.batch_group'])).to.be.equal(true);
                  expect(['Active'].includes(item['fund.fund_status'])).to.be.equal(true);
                  if (item['fund.acquisition_unit']) {
                    expect(['main'].includes(item['fund.acquisition_unit'])).to.be.equal(false);
                  }
                });
              });
            });
          });
        });

      it('C689200 Search for "Voucher lines with fund" in the query builder using the fields "Voucher — Disbursement number", " and "Fund with ledger — Fund — Name" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C689200'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.disbursement_number': { '$ne': '1' } },
              { 'fund.name': { '$ne': 'a' } },
              { 'voucher.voucher_number': { '$ne': '1' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithFundSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher.disbursement_number']).to.not.be.equal('1');
                expect(item['fund.name']).to.not.be.equal('a');
                expect(item['voucher.voucher_number']).to.not.be.equal('1');
              });
            });
          });
        });
    });

    describe('Voucher lines with invoice, fund, organization', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiFinanceViewEditDeleteFundBudget.gui,
          Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Voucher lines with invoice, fund, organization').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C692083 Search for "Voucher lines with invoice,fund, organization" in the query builder using the fields "Voucher line — External account number", "Invoice — Terms", "Ledger — Restrict expenditures" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692083'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher_line.external_account_number': { '$ne': 'test' } },
              { 'invoice.payment_terms': { '$empty': true } },
              { 'ledger.restrict_expenditures': { '$eq': 'true' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithInvoiceFundOrganizationSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher_line.external_account_number']).to.not.be.equal('test');
                expect(item['invoice.payment_terms']).to.be.equal(null);
                expect(item['ledger.restrict_expenditures']).to.be.equal('true');
              });
            });
          });
        });

      it('C692082 Search for "Voucher lines with invoice,fund, organization" in the query builder using the fields "Invoice — Note", "Ledger — Status", "Invoice — Accounting code", "Voucher — Export to accounting" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692082'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice.note': { '$ne': 'test' } },
              { 'ledger.ledger_status': { '$in': ['Active'] } },
              { 'invoice.accounting_code': { '$ne': 'test' } },
              { 'voucher.export_to_accounting': { '$eq': 'true' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithInvoiceFundOrganizationSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['invoice.note']).to.not.be.equal('test');
                expect(['Active'].includes(item['ledger.ledger_status'])).to.be.equal(true);
                expect(item['invoice.accounting_code']).to.not.be.equal('test');
                expect(item['voucher.export_to_accounting']).to.be.equal('true');
              });
            });
          });
        });

      it('C688836 Search for "Voucher lines with invoice,fund, organization" in the query builder using the fields "Voucher line — Created date", " Invoice — Created date", "Invoice — Payment date" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C688836'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher_line.created_date': { '$gte': '2020-01-01T00:00:00.000' } },
              { 'invoice.created_date': { '$lte': '2040-01-01T00:00:00.000' } },
              { 'invoice.payment_date': { '$gte': '2020-01-01T00:00:00.000' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithInvoiceFundOrganizationSchema).then((body) => {
              body.content.forEach((item) => {
                expect(new Date(item['voucher_line.created_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(new Date(item['invoice.created_date'])).to.be.lessThan(new Date('2040-01-01T00:00:00.000'));
                expect(new Date(item['invoice.payment_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
              });
            });
          });
        });

      it('C688832 Search for "Voucher lines with invoice,fund, organization" in the query builder using the fields "Voucher — Status", "Invoice — Exchange rate," "Organization — is vendor" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C688832'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'voucher.status': { '$in': ['Paid'] } },
              { 'invoice.exchange_rate': { '$gte': '1' } },
              { 'organization.is_vendor': { '$eq': 'true' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, voucherLinesWithInvoiceFundOrganizationSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['voucher.status'].includes('Paid')).to.be.equal(true);
                expect(item['invoice.exchange_rate'] >= 1).to.be.equal(true);
                expect(item['organization.is_vendor']).to.be.equal('true');
              });
            });
          });
        });

      it('C688808 Search for "Voucher lines with invoice,fund, organization" in the query builder using the fields "Fund — Acquisition unit names","Invoice — Payment method", "Organization — Status" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C688808'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'invoice.payment_method': { '$contains': 'a' } },
              { 'organization.status': { '$in': ['Active', 'Inactive'] } },
            ]
          };

          getFilteredValues('fund.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'fund.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, voucherLinesWithInvoiceFundOrganizationSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['invoice.payment_method'].includes('a')).to.be.equal(true);
                expect(['Active', 'Inactive'].includes(item['organization.status'])).to.be.equal(true);
                if (item['fund.acquisition_unit']) {
                  expect(['main'].includes(item['fund.acquisition_unit'])).to.be.equal(false);
                }
              });
            });
          });
        });
    });

    describe('Transactions', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Transactions').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C692079 Search for "Transactions" in the query builder using the fields "Fiscal year — Acquisition unit names", "From fund — Updated date" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692079'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'from_fund.updated_date': { '$gt': '2020-01-01T00:00:00.000' } },
            ]
          };

          getFilteredValues('fiscal_year.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'fiscal_year.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, transactionsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(new Date(item['from_fund.updated_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                if (item['fiscal_year.acquisition_unit']) {
                  expect(['main'].includes(item['fiscal_year.acquisition_unit'])).to.be.equal(false);
                }
              });
            });
          });
        });

      it('C692078 Search for "Transactions" in the query builder using the fields "Transaction — Invoice cancelled", " From fund — Version" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692078'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'transaction.invoice_cancelled': { '$eq': 'true' } },
              { 'from_fund.version': { '$gt': '0' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, transactionsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['transaction.invoice_cancelled']).to.be.equal('true');
                expect(item['from_fund.version'] > 0).to.be.equal(true);
              });
            });
          });
        });

      it('C692077 Search for "Transactions" in the query builder using the fields "Transaction — Encumbrance order type", "Transaction — Encumbrance re-encumber" and "From fund — Restrict by locations" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692077'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'transaction.order_type': { '$in': ['Ongoing'] } },
              { 'transaction.re_encumber': { '$ne': 'false' } },
              { 'from_fund.restrict_by_locations': { '$eq': 'false' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, transactionsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(['Ongoing'].includes(item['transaction.order_type'])).to.be.equal(true);
                expect(item['transaction.re_encumber']).to.not.be.equal('false');
                expect(item['from_fund.restrict_by_locations']).to.be.equal('false');
              });
            });
          });
        });

      it('C692075 Search for "Transactions" in the query builder using the fields "To fund — Acquisition unit names", "To fund — Donor organizations" and "To fund — External account number" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692075'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'to_fund.donor_organizations': { '$empty': true } },
              { 'to_fund.external_account_no': { '$ne': '1' } },
            ]
          };

          getFilteredValues('to_fund.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'to_fund.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, transactionsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['to_fund.donor_organizations']).to.be.equal(null);
                expect(item['to_fund.external_account_no']).to.not.be.equal('1');
                if (item['to_fund.acquisition_unit']) {
                  expect(['main'].includes(item['to_fund.acquisition_unit'])).to.be.equal(false);
                }
              });
            });
          });
        });

      it('C692074 Search for "Transactions" in the query builder using the fields "Transaction — Amount", "Transaction — Created date" and "Fiscal year — Code" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692074'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'transaction.amount': { '$gt': '1' } },
              { 'transaction.amount_credited': { '$lte': '100000' } },
              { 'fiscal_year.code': { '$contains': '20' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, transactionsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['transaction.amount'] > 1).to.be.equal(true);
                expect(item['transaction.amount_credited'] <= 100000).to.be.equal(true);
                expect(item['fiscal_year.code'].includes('20')).to.be.equal(true);
              });
            });
          });
        });

      it('C688736 Search for "Transactions" in the query builder using the fields "From fund — Name", "Fiscal year — Currency and "From fund — Acquisition unit" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C688736'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'from_fund.name': { '$empty': false } },
              { 'fiscal_year.currency': { '$contains': 'S' } },
            ]
          };

          getFilteredValues('from_fund.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'from_fund.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, transactionsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['from_fund.name']).to.not.be.equal(null);
                expect(item['fiscal_year.currency'].includes('S')).to.be.equal(true);
                if (item['from_fund.acquisition_unit']) {
                  expect(['main'].includes(item['from_fund.acquisition_unit'])).to.be.equal(false);
                }
              });
            });
          });
        });
    });

    describe('Fund with ledger', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiFinanceViewEditDeleteFundBudget.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Fund with ledger').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C667580 Search for "Fund with ledger" in the query builder using the fields "Ledger — Code", "Ledger — Currency", "Fund — External account number" and "Fund — Name" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C667580'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'ledger.code': { '$contains': 'e' } },
              { 'ledger.currency': { '$starts_with': 'US' } },
              { 'fund.external_account_no': { '$empty': false } },
              { 'fund.name': { '$contains': 'a' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, fundsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['ledger.code'].toLowerCase().includes('e')).to.be.equal(true);
                expect(item['ledger.currency'].startsWith('US')).to.be.equal(true);
                expect(item['fund.external_account_no']).to.not.be.equal(null);
                expect(item['fund.name'].toLowerCase().includes('a')).to.be.equal(true);
              });
            });
          });
        });

      it('C667573 Search for "Fund with ledger" in the query builder using the fields "Ledger — UUID", " Fund — UUID", "Ledger — Version" and "Fund — Version" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C667573'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'ledger.id': { '$empty': false } },
              { 'fund.id': { '$empty': false } },
              { 'ledger.version': { '$gte': '0' } },
              { 'fund.version': { '$gte': '0' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, fundsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['ledger.id']).to.not.be.equal(null);
                expect(item['fund.id']).to.not.be.equal(null);
                expect(item['ledger.version'] >= 0).to.be.equal(true);
                expect(item['fund.version'] >= 0).to.be.equal(true);
              });
            });
          });
        });

      it('C667571 Search for "Fund with ledger" in the query builder using the fields "Ledger — Restrict expenditures" , "Fund — Restrict by locations", "Fund — Updated date" and "Ledger — Created date" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C667571'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'ledger.restrict_expenditures': { '$eq': 'true' } },
              { 'fund.restrict_by_locations': { '$ne': 'true' } },
              { 'fund.updated_date': { '$gte': '2020-01-01T00:00:00.000' } },
              { 'ledger.created_date': { '$lte': '2040-01-01T00:00:00.000' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, fundsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['ledger.restrict_expenditures']).to.be.equal('true');
                expect(item['fund.restrict_by_locations']).to.be.equal('false');
                expect(new Date(item['fund.updated_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(new Date(item['ledger.created_date'])).to.be.lessThan(new Date('2040-01-01T00:00:00.000'));
              });
            });
          });
        });

      it('C667570 Search for "Fund with ledger" in the query builder using the fields "Ledger — Fiscal year one", "Fund type — Type", "Fund — Status" and "Ledger — Status" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C667570'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'fund.fund_status': { '$eq': 'Active' } },
            ]
          };

          getAllValues('ledger.fiscal_year_one', 'name').then(({ values }) => {
            const obj = {
              'ledger.fiscal_year_one': {
                '$in': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            getFilteredValues('fund_type.name', 'name', ['Books', 'Audio']).then(({ values }) => {
              const obj = {
                'fund_type.name': {
                  '$nin': values
                }
              };
              fqlQuery.$and.push(obj);
            }).then(() => {
              validateResponse(fqlQuery, fundsSchema).then((body) => {
                body.content.forEach((item) => {
                  expect(item['fund.fund_status'].includes('Active')).to.be.equal(true);
                  if (item['fund_type.name']) {
                    expect(['Books', 'Audio'].includes(item['fund_type.name'])).to.be.equal(false);
                  }
                });
              });
            });
          });
        });

      it('C667568 Search for "Fund with ledger" in the query builder using the fields "Fund — Acquisition unit names", "Fund — Donor organizations" and " Fund — Transfer from" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C667568'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'fund.donor_organizations': { '$empty': true } },
            ]
          };

          getFilteredValues('fund.acquisition_unit', 'name', ['main']).then(({ values }) => {
            const obj = {
              'fund.acquisition_unit': {
                '$nin': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            getAllValues('fund.allocated_from', 'allocated_from').then(({ values }) => {
              const obj = {
                'fund.allocated_from': {
                  '$in': values
                }
              };
              fqlQuery.$and.push(obj);
            }).then(() => {
              validateResponse(fqlQuery, fundsSchema).then((body) => {
                body.content.forEach((item) => {
                  expect(item['fund.donor_organizations']).to.be.equal(null);
                  expect(['main'].includes(item['fund.allocated_from'])).to.be.equal(false);
                });
              });
            });
          });
        });
    });

    describe('Budgets', () => {
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiFinanceViewEditDeleteFundBudget.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          cy.getUserToken(userData.username, userData.password);
        });
        Lists.getTypeIdByNameViaApi('Budgets').then((typeId) => {
          recordTypeId = typeId;
        }).then(() => {
          Lists.getTypeByIdViaApi(recordTypeId).then((typeResponse) => {
            typeData = typeResponse.body;
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it('C688840 Search for "Budgets" in the query builder using the fields "Fund — Fund — Acquisition unit names", "Budget — Budget UUID", "Fiscal Year — Version", "Fund — Fund — Status" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C688840'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'budget.id': { '$nin': ['test'] } },
              { 'fiscal_year.version': { '$gte': '1' } },
              { 'fund.fund.fund_status': { '$in': ['Active', 'Frozen', 'Inactive'] } },
            ]
          };

          getAllValues('fund.fund.acquisition_unit', 'name').then(({ values }) => {
            const obj = {
              'fund.fund.acquisition_unit': {
                '$in': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, budgetsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(['test'].includes(item['budget.id'])).to.be.equal(false);
                expect(item['fiscal_year.version'] >= 1).to.be.equal(true);
                expect(['Active', 'Frozen', 'Inactive'].includes(item['fund.fund.fund_status'])).to.be.equal(true);
              });
            });
          });
        });

      it('C688845 Search for "Budgets" in the query builder using the fields "Fiscal Year — Created date", "Fiscal Year — Period begin date", "Fiscal Year — Code", "Fiscal Year — Description" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C688845'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'fiscal_year.created_date': { '$gte': '2025-01-01T00:00:00.000' } },
              { 'fiscal_year.period_begin_date': { '$lte': '2040-01-01T00:00:00.000' } },
              { 'fiscal_year.code': { '$starts_with': 'F' } },
              { 'fiscal_year.description': { '$ne': 'Test' } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, budgetsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(new Date(item['fiscal_year.created_date'])).to.be.greaterThan(new Date('2025-01-01T00:00:00.000'));
                expect(new Date(item['fiscal_year.period_begin_date'])).to.be.lessThan(new Date('2040-01-01T00:00:00.000'));
                expect(item['fiscal_year.code'].startsWith('F')).to.be.equal(true);
                expect(item['fiscal_year.description']).to.not.be.equal('Test');
              });
            });
          });
        });

      it('C689199 Search for "Budgets" in the query builder using the fields Fund — Ledger — Fiscal year one, Budget — Status, Fund — Ledger — Restrict encumbrance, Fund — Ledger — Restrict expenditures (corsair)',
        { tags: ['criticalPath', 'corsair', 'C689199'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'budget.budget_status': { '$nin': ['Active'] } },
              { 'fund.ledger.restrict_encumbrance': { '$eq': 'true' } },
              { 'fund.ledger.restrict_expenditures': { '$ne': 'false' } },
            ]
          };

          getAllValues('fund.ledger.fiscal_year_one', 'name').then(({ values }) => {
            const obj = {
              'fund.ledger.fiscal_year_one': {
                '$in': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, budgetsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(['Active'].includes(item['budget.budget_status'])).to.be.equal(false);
                expect(item['fund.ledger.restrict_encumbrance']).to.be.equal('true');
                expect(item['fund.ledger.restrict_expenditures']).to.not.be.equal('false');
              });
            });
          });
        });

      it('C692084 Search for "Budgets" in the query builder using the fields "Budget — Allocated", "Fiscal Year — Currency", "Fund — Fund — Donor organizations","Fund — Ledger — UUID" (corsair)',
        { tags: ['criticalPath', 'corsair', 'C692084'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'budget.allocated': { '$gt': '-2' } },
              { 'fiscal_year.currency': { '$ne': 'EURO' } },
              { 'fund.fund.donor_organizations': { '$empty': true } },
              { 'fund.ledger.id': { '$empty': false } },
            ]
          };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, budgetsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['budget.allocated']).to.be.greaterThan(-2);
                expect(item['fiscal_year.currency']).to.not.be.equal('EURO');
                expect(item['fund.fund.donor_organizations']).to.be.equal(null);
                expect(item['fund.ledger.id']).to.not.be.equal(null);
              });
            });
          });
        });

      it('C692085 Search for "Budgets" in the query builder using the fields "Fiscal Year — Series", "Fund — Fund — Transfer to", "Fund — Fund — External account number", Budget — Initial allocation (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692085'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'fiscal_year.series': { '$ne': '1' } },
              { 'fund.fund.external_account_no': { '$ne': '115878270630030' } },
              { 'budget.initial_allocation': { '$lte': '100000000' } },
            ]
          };

          getAllValues('fund.fund.allocated_to', 'allocated_to').then(({ values }) => {
            const obj = {
              'fund.fund.allocated_to': {
                '$in': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, budgetsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['fiscal_year.series']).to.not.be.equal(1);
                expect(item['fund.fund.external_account_no']).to.not.be.equal('115878270630030');
                expect(item['budget.initial_allocation']).to.be.lessThan(100000000);
              });
            });
          });
        });

      it('C692086 Search for "Budgets" in the query builder using the fields "Budget — Net transfers", "Fiscal Year — Updated date", "Fiscal Year — Name", "Fund — Fund — UUID" (corsair)',
        { tags: ['extendedPath', 'corsair', 'C692086'] },
        () => {
          const fqlQuery = {
            '$and': [
              { 'budget.net_transfers': { '$gt': '1' } },
              { 'fiscal_year.updated_date': { '$gt': '2020-01-01T00:00:00.000' } },
              { 'fund.fund.id': { '$empty': false } },
            ]
          };

          getAllValues('fiscal_year.name', 'name').then(({ values }) => {
            const obj = {
              'fiscal_year.name': {
                '$in': values
              }
            };
            fqlQuery.$and.push(obj);
          }).then(() => {
            validateResponse(fqlQuery, budgetsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['budget.net_transfers']).to.be.greaterThan(1);
                expect(new Date(item['fiscal_year.updated_date'])).to.be.greaterThan(new Date('2020-01-01T00:00:00.000'));
                expect(item['fund.fund.id']).to.not.be.equal(null);
              });
            });
          });
        });
    });
  });
});
