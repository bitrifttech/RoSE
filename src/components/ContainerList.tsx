import { Container } from "@/types/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContainerListProps {
  containers: Container[];
  error?: string;
}

export function ContainerList({ containers, error }: ContainerListProps) {
  if (error) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Running Containers</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          {containers.length === 0 ? (
            <p className="text-muted-foreground">No containers running</p>
          ) : (
            <div className="space-y-4">
              {containers.map((container) => (
                <Card key={container.id}>
                  <CardContent className="pt-6">
                    <div className="grid gap-1">
                      <div className="flex justify-between">
                        <span className="font-medium">ID:</span>
                        <span className="text-muted-foreground">{container.id.substring(0, 12)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Name:</span>
                        <span className="text-muted-foreground">{container.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <span className="text-muted-foreground">{container.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Ports:</span>
                        <span className="text-muted-foreground">
                          {container.ports.map(p => `${p.internal}->${p.external}`).join(', ')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
