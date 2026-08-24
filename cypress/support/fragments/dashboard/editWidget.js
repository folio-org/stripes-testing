import { including, Pane } from '../../../../interactors';
import WidgetFormConstructor from './widgetForm';

const EDIT_WIDGET = 'Edit widget';

const editWidgetPane = Pane(including(EDIT_WIDGET));
const WidgetForm = WidgetFormConstructor(editWidgetPane);

const getDefinitionLabelsMap = (definitionEntity) => new Map(definitionEntity.columns.map((c) => [c.name, c.label]));

export default {
  ...WidgetForm,

  // Should be compatible with widget instance response (SimpleSearch)
  assertWidgetFields(
    {
      name, // required
      configuration: {
        configurableProperties, // optional
        filterColumns, // optional
        matches, // optional
        resultColumns, // optional
        sortColumn, // optional
      } = {},
      definition, // required
    },
    simpleSearchDefinition, // For labels mappings: required if some of optional fields asserting
  ) {
    WidgetForm.assertSearchAccordionExists();
    WidgetForm.assertFiltersAccordionExists();
    WidgetForm.assertResultsDisplayAccordionExists();

    WidgetForm.assertWidgetName(name);
    WidgetForm.assertWidgetDefinition(definition.name);

    this.handleOptionalFieldsAssertions(
      {
        configurableProperties,
        filterColumns,
        matches,
        resultColumns,
        sortColumn,
      },
      simpleSearchDefinition,
    );
  },

  handleOptionalFieldsAssertions(configuration = {}, simpleSearchDefinition = {}) {
    const HANDLERS_DICT = {
      configurableProperties: this.assertConfigurableProperties,
      filterColumns: this.assertFilterColumns,
      matches: this.assertMatches,
      resultColumns: this.assertResultColumns,
      sortColumn: this.assertSortColumn,
    };

    Object.entries(configuration)
      .filter(([_, v]) => Boolean(v))
      .forEach(([k, v]) => {
        HANDLERS_DICT[k](v, simpleSearchDefinition);
      });
  },

  assertConfigurableProperties({ urlLink }) {
    WidgetForm.assertUrlLink(urlLink);
  },

  assertFilterColumns(columns, simpleSearchDefinition) {
    const labelsMap = getDefinitionLabelsMap(simpleSearchDefinition.filters);

    columns.forEach(({ fieldType: _, name, rules }, index) => {
      WidgetForm.assertFilterColumn(labelsMap.get(name), { index });

      rules?.forEach(({ comparator, filterValue }, ruleIndex) => {
        WidgetForm.assertFilterRuleComparator(comparator, { index, ruleIndex });
        WidgetForm.assertFilterRuleValue(filterValue, { index, ruleIndex });
      });
    });
  },

  assertMatches({ term, matches = {} }, simpleSearchDefinition) {
    const labelsMap = getDefinitionLabelsMap(simpleSearchDefinition.matches);

    WidgetForm.assertSearchTerm(term);
    WidgetForm.assertMatchesCheckboxes(
      Object.entries(matches).map(([k, v]) => [labelsMap.get(k), v]),
    );
  },

  assertResultColumns(columns, simpleSearchDefinition) {
    const labelsMap = getDefinitionLabelsMap(simpleSearchDefinition.results);

    WidgetForm.assertResultsColumnsMappings(
      columns.map(({ label, name }) => [labelsMap.get(name), label]),
    );
  },

  assertSortColumn({ name, sortType }, simpleSearchDefinition) {
    const labelsMap = getDefinitionLabelsMap(simpleSearchDefinition.sort);

    WidgetForm.assertSortBy(labelsMap.get(name));
    WidgetForm.assertSortDirection(sortType);
  },
};
