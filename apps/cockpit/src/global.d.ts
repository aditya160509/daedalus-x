// Side-effect stylesheet imports (TS 7 checks these by default).
declare module "*.css";

declare module "@kitware/vtk.js/Rendering/Core/SurfaceLICMapper" {
  import type vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
  interface SurfaceLICMapper extends vtkMapper {
    getLicInterface(): {
      setEnableLIC(value: boolean): void;
      setNumberOfSteps(value: number): void;
      setLICIntensity(value: number): void;
    };
  }
  const mapper: { newInstance(): SurfaceLICMapper };
  export default mapper;
}
