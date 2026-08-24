import { Pane } from '../../../../interactors';
import WidgetFormConstructor from './widgetForm';

const NEW_WIDGET = 'New widget';

const newWidgetPane = Pane(NEW_WIDGET);
const WidgetForm = WidgetFormConstructor(newWidgetPane);

export default {
  ...WidgetForm,

  // SimpleSearch
  assertWidgetDefaults({
    name,
    configuration: { configurableProperties, filters, matches, results },
  }) {
    WidgetForm.assertSearchAccordionExists();
    WidgetForm.assertFiltersAccordionExists();
    WidgetForm.assertResultsDisplayAccordionExists();

    WidgetForm.assertWidgetName(name);
    WidgetForm.assertUrlLink(configurableProperties.urlLink.defValue);
    WidgetForm.assertMatchesCheckboxes(matches?.columns?.map((col) => [col.label, col.default]));
    WidgetForm.assertFiltersColumnsOptions(filters?.columns?.map(({ label }) => label));
    WidgetForm.assertResultsColumnsOptions(results?.columns?.map(({ label }) => label));
  },
};
