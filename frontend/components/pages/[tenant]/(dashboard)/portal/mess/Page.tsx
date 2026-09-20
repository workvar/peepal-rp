"use client";

import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { LIST_MY_MESS_MENU } from "@/graphql/queries/campus";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEALS = ["breakfast", "lunch", "snacks", "dinner"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

type MenuCell = {
  id: string;
  dayOfWeek: number;
  meal: string;
  items?: string | null;
  hostelBlockName?: string | null;
};

/**
 * Read-only weekly menu for the student's own block. Today's card is pulled to
 * the top since that is what a student almost always opens this page for.
 */
export default function MyMessMenuPage() {
  const { data, loading } = useQuery(LIST_MY_MESS_MENU);
  const cells: MenuCell[] = data?.myMessMenu ?? [];

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  const today = new Date().getDay();
  const orderedDays = [...DAYS.keys()].sort((a, b) => {
    const rank = (d: number) => (d - today + 7) % 7;
    return rank(a) - rank(b);
  });

  const cellFor = (day: number, meal: string) =>
    cells.find((c) => c.dayOfWeek === day && c.meal === meal);

  const blockName = cells.find((c) => c.hostelBlockName)?.hostelBlockName;

  return (
    <div>
      <Header
        title="Mess Menu"
        subtitle={blockName ? `This week at ${blockName}` : "This week's menu"}
      />

      {cells.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No menu has been published yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orderedDays.map((day) => (
            <div key={day} className="card space-y-3">
              <h3 className="font-medium">
                {DAYS[day]}
                {day === today && <span className="ml-2 text-xs text-green-600">Today</span>}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {MEALS.map((meal) => {
                  const cell = cellFor(day, meal);
                  return (
                    <div key={meal}>
                      <p className="text-xs text-muted-foreground/70">{MEAL_LABELS[meal]}</p>
                      <p className="whitespace-pre-wrap text-sm">{cell?.items || "—"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
