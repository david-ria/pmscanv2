import { Button } from "@/components/ui/button";

type PMType = "pm1" | "pm25" | "pm10";

interface PMTypeSelectorProps {
  pmType: PMType;
  onPMTypeChange: (type: PMType) => void;
}

export const PMTypeSelector = ({ pmType, onPMTypeChange }: PMTypeSelectorProps) => {
  return (
    <div className="flex justify-center gap-2 py-4 my-4">
      <Button
        variant={pmType === "pm1" ? "default" : "outline"}
        size="sm"
        onClick={() => onPMTypeChange("pm1")}
        className="min-w-16 px-3 h-12 flex flex-col justify-center"
      >
        <span className="text-sm font-semibold">1</span>
        <span className="text-xs">PM</span>
      </Button>
      <Button
        variant={pmType === "pm25" ? "default" : "outline"}
        size="sm"
        onClick={() => onPMTypeChange("pm25")}
        className="min-w-16 px-3 h-12 flex flex-col justify-center"
      >
        <span className="text-sm font-semibold">2.5</span>
        <span className="text-xs">PM</span>
      </Button>
      <Button
        variant={pmType === "pm10" ? "default" : "outline"}
        size="sm"
        onClick={() => onPMTypeChange("pm10")}
        className="min-w-16 px-3 h-12 flex flex-col justify-center"
      >
        <span className="text-sm font-semibold">10</span>
        <span className="text-xs">PM</span>
      </Button>
    </div>
  );
};