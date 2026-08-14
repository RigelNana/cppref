import BehaviorTerm from "./BehaviorTerm.astro";
import CorrectedBehavior from "./CorrectedBehavior.astro";
import Declaration from "./Declaration.astro";
import DeclarationDescription from "./DeclarationDescription.astro";
import DeclarationDoc from "./DeclarationDoc.astro";
import DefectReport from "./DefectReport.astro";
import DefectReportList from "./DefectReportList.astro";
import DescriptionBody from "./DescriptionBody.astro";
import DescriptionItem from "./DescriptionItem.astro";
import DescriptionList from "./DescriptionList.astro";
import DescriptionTerm from "./DescriptionTerm.astro";
import DocTable from "./DocTable.astro";
import DocAnchor from "./DocAnchor.astro";
import DocLink from "./DocLink.astro";
import HeaderRef from "./HeaderRef.astro";
import InlineRevision from "./InlineRevision.astro";
import PaperLink from "./PaperLink.astro";
import Parameter from "./Parameter.astro";
import ParameterList from "./ParameterList.astro";
import PublishedBehavior from "./PublishedBehavior.astro";
import Revision from "./Revision.astro";

export const mdxComponents = {
  a: DocAnchor,
  BehaviorTerm,
  CorrectedBehavior,
  Declaration,
  DeclarationDescription,
  DeclarationDoc,
  DefectReport,
  DefectReportList,
  DescriptionBody,
  DescriptionItem,
  DescriptionList,
  DescriptionTerm,
  DocLink,
  HeaderRef,
  InlineRevision,
  PaperLink,
  Parameter,
  ParameterList,
  PublishedBehavior,
  Revision,
  table: DocTable,
};
