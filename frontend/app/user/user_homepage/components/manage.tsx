"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2,
    MapPin,
    Calendar,
    User,
    Utensils,
    TruckIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface AcceptedRequest {
    _id: string;
    donorUsername: string;
    userUsername: string;
    availableFood: string[];
    location: string;
    timestamp: string;
    post_id: string;
}

interface DeliveryBoy {
    _id: string;
    deliveryBoyName: string;
    status: string;
    distance?: number;
    currentLocation?: {
        coordinates: [number, number];
    };
    deliveredOrders?: number;
}

interface AssignedOrder {
    _id: string;
    donorUsername: string;
    userUsername: string;
    pickupLocation: string;
    pickupLocationCoordinates: {
        coordinates: [number, number];
    };
    deliveryLocation: string;
    deliveryBoyName: string;
    status: "delivered" | "picked-up" | "on-going";
    timestamp: string;
}

export function ManageSection() {
    const [acceptedRequests, setAcceptedRequests] = useState<AcceptedRequest[]>(
        []
    );
    const [nearbyDeliveryBoys, setNearbyDeliveryBoys] = useState<DeliveryBoy[]>(
        []
    );
    const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
    const [selectedRequest, setSelectedRequest] =
        useState<AcceptedRequest | null>(null);
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<string>("");
    const [deliveryLocation, setDeliveryLocation] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const { toast } = useToast();
    const router = useRouter();
    const [availableDeliveryBoys, setAvailableDeliveryBoys] = useState<
        DeliveryBoy[]
    >([]);

    // Add this function to ensure CSRF token is fetched before making requests
    const fetchCsrfToken = async () => {
        try {
            const response = await fetch(
                "http://localhost:9500/user/csrf-token",
                {
                    credentials: "include",
                }
            );
            const data = await response.json();
            Cookies.set("XSRF-TOKEN", data.csrfToken);
            return data.csrfToken;
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch CSRF token",
                variant: "destructive",
            });
            return null;
        }
    };

    useEffect(() => {
        const init = async () => {
            // Ensure CSRF token is set before making any requests
            if (!Cookies.get("XSRF-TOKEN")) {
                await fetchCsrfToken();
            }
            fetchAcceptedRequests();
            fetchAssignedOrders();
            fetchAvailableDeliveryBoys();
        };

        init();
    }, []);

    const fetchAcceptedRequests = async () => {
        try {
            setIsLoading(true);
            let csrfToken = Cookies.get("XSRF-TOKEN");

            // If no CSRF token exists, fetch a new one
            if (!csrfToken) {
                csrfToken = await fetchCsrfToken();
                if (!csrfToken) {
                    throw new Error("Failed to fetch CSRF token");
                }
            }

            const response = await fetch(
                "http://localhost:9500/request/getAcceptedRequests",
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch accepted requests");
            }

            const data = await response.json();
            setAcceptedRequests(data.acceptedRequests);
        } catch (error) {
            console.error("Error fetching accepted requests:", error);
            toast({
                title: "Error",
                description: "Failed to fetch accepted requests",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNearbyDeliveryBoys = async (postId: string) => {
        try {
            const csrfToken = Cookies.get("XSRF-TOKEN");
            const response = await fetch(
                `http://localhost:9500/deliveryboy/findNearbyPosts?postId=${postId}`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch nearby delivery boys");
            }

            const data = await response.json();
            setNearbyDeliveryBoys(data.closestDeliveryBoys || []);
        } catch (error) {
            console.error("Error fetching nearby delivery boys:", error);
            toast({
                title: "Error",
                description: "Failed to fetch nearby delivery boys",
                variant: "destructive",
            });
        }
    };

    const assignOrder = async () => {
        if (!selectedRequest || !selectedDeliveryBoy || !deliveryLocation) {
            toast({
                title: "Error",
                description:
                    "Please select a request, delivery boy, and enter a delivery location",
                variant: "destructive",
            });
            return;
        }

        try {
            // Get CSRF token if needed
            let csrfToken = Cookies.get("XSRF-TOKEN");
            if (!csrfToken) {
                const response = await fetch(
                    "http://localhost:9500/csrf-token", // Use the main CSRF endpoint
                    {
                        credentials: "include",
                    }
                );
                const data = await response.json();
                csrfToken = data.csrfToken;
                Cookies.set("XSRF-TOKEN", csrfToken);
            }

            const response = await fetch(
                "http://localhost:9500/order/assignOrder",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken,
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        requestId: selectedRequest._id,
                        deliveryBoyId: selectedDeliveryBoy,
                        deliveryLocation,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to assign order");
            }

            toast({
                title: "Success",
                description: "Order assigned successfully!",
            });

            await fetchAcceptedRequests();
            await fetchAssignedOrders();
            setSelectedRequest(null);
            setSelectedDeliveryBoy("");
            setDeliveryLocation("");
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error assigning order:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to assign order",
                variant: "destructive",
            });
        }
    };

    const fetchAssignedOrders = async () => {
        try {
            // Get CSRF token if needed
            let csrfToken = Cookies.get("XSRF-TOKEN");
            if (!csrfToken) {
                const response = await fetch(
                    "http://localhost:9500/csrf-token", // Use the main CSRF endpoint
                    {
                        credentials: "include",
                    }
                );
                const data = await response.json();
                csrfToken = data.csrfToken;
                Cookies.set("XSRF-TOKEN", csrfToken);
            }

            const response = await fetch(
                "http://localhost:9500/order/getOrders",
                {
                    method: "GET",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch assigned orders");
            }

            const data = await response.json();

            if (data.success && data.orders) {
                // Changed from assignedOrders to orders
                setAssignedOrders(data.orders);
            } else {
                setAssignedOrders([]);
                toast({
                    title: "No Orders Found",
                    description: "No orders available.",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error fetching assigned orders:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to fetch assigned orders",
                variant: "destructive",
            });
        }
    };

    const fetchAvailableDeliveryBoys = async () => {
        try {
            let csrfToken = Cookies.get("XSRF-TOKEN");
            if (!csrfToken) {
                csrfToken = await fetchCsrfToken();
                if (!csrfToken) {
                    throw new Error("Failed to fetch CSRF token");
                }
            }

            const response = await fetch(
                "http://localhost:9500/deliveryboy/getAllDeliveryBoys",
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch delivery boys");
            }

            const data = await response.json();
            setAvailableDeliveryBoys(data.deliveryBoys || []);
        } catch (error) {
            console.error("Error fetching delivery boys:", error);
            toast({
                title: "Error",
                description: "Failed to fetch delivery boys",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 h-screen flex flex-col space-y-6">
            <div className="grid gap-6 md:grid-cols-3 flex-grow">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Available Delivery Boys</CardTitle>
                        <CardDescription>
                            View all registered delivery boys and their status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden">
                        <ScrollArea className="h-full pr-4">
                            {availableDeliveryBoys.map((boy) => (
                                <Card key={boy._id} className="mb-4">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-semibold">
                                                {boy.deliveryBoyName}
                                            </p>
                                            <Badge
                                                variant={
                                                    boy.status === "available"
                                                        ? "success"
                                                        : "secondary"
                                                }
                                            >
                                                {boy.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <p>
                                                Delivered Orders:{" "}
                                                {boy.deliveredOrders || 0}
                                            </p>
                                            {boy.currentLocation && (
                                                <p>
                                                    Location:{" "}
                                                    {boy.currentLocation.coordinates.join(
                                                        ", "
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="flex flex-col md:col-span-2">
                    <CardHeader>
                        <CardTitle>Assign Delivery Boy</CardTitle>
                        <CardDescription>
                            Manage accepted requests and assign delivery boys
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden">
                        <ScrollArea className="h-full pr-4">
                            {acceptedRequests.map((request) => (
                                <Card key={request._id} className="mb-4">
                                    <CardContent className="p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <User className="h-4 w-4" />
                                            <p className="font-semibold">
                                                {request.donorUsername}
                                            </p>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <Utensils className="h-4 w-4" />
                                                <p>
                                                    {request.availableFood.join(
                                                        ", "
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <MapPin className="h-4 w-4" />
                                                <p>{request.location}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4" />
                                                <p>
                                                    {new Date(
                                                        request.timestamp
                                                    ).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Dialog
                                            open={isDialogOpen}
                                            onOpenChange={setIsDialogOpen}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    onClick={() => {
                                                        setSelectedRequest(
                                                            request
                                                        );
                                                        fetchNearbyDeliveryBoys(
                                                            request.post_id
                                                        );
                                                    }}
                                                    className="mt-4 w-full"
                                                    variant="secondary"
                                                >
                                                    Assign Delivery Boy
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Assign Delivery Boy
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Select a delivery boy
                                                        and enter the delivery
                                                        location for this
                                                        request.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="mt-4 space-y-4">
                                                    <Select
                                                        onValueChange={
                                                            setSelectedDeliveryBoy
                                                        }
                                                        value={
                                                            selectedDeliveryBoy
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Delivery Boy" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableDeliveryBoys
                                                                .filter(
                                                                    (boy) =>
                                                                        boy.status ===
                                                                        "available"
                                                                )
                                                                .map((boy) => (
                                                                    <SelectItem
                                                                        key={
                                                                            boy._id
                                                                        }
                                                                        value={
                                                                            boy._id
                                                                        }
                                                                    >
                                                                        <div className="flex justify-between items-center w-full">
                                                                            <span>
                                                                                {
                                                                                    boy.deliveryBoyName
                                                                                }
                                                                            </span>
                                                                            {nearbyDeliveryBoys.some(
                                                                                (
                                                                                    nearby
                                                                                ) =>
                                                                                    nearby._id ===
                                                                                    boy._id
                                                                            ) && (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="ml-2"
                                                                                >
                                                                                    Nearby
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        className="w-full"
                                                        placeholder="Enter Delivery Location"
                                                        value={deliveryLocation}
                                                        onChange={(e) =>
                                                            setDeliveryLocation(
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        onClick={assignOrder}
                                                        className="w-full"
                                                    >
                                                        Assign Order
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </CardContent>
                                </Card>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="flex flex-col md:col-span-3">
                    <CardHeader>
                        <CardTitle>Delivery Status</CardTitle>
                        <CardDescription>
                            Track the status of assigned orders
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-4">
                                {isLoading ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : assignedOrders.length > 0 ? (
                                    assignedOrders.map((order) => (
                                        <Card key={order._id} className="mb-4">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-sm font-medium">
                                                        {new Date(
                                                            order.timestamp
                                                        ).toLocaleDateString()}
                                                    </p>
                                                    <Badge
                                                        variant={
                                                            order.status ===
                                                            "delivered"
                                                                ? "success"
                                                                : order.status ===
                                                                  "picked-up"
                                                                ? "warning"
                                                                : "destructive"
                                                        }
                                                    >
                                                        {order.status ===
                                                        "delivered"
                                                            ? "Delivered"
                                                            : order.status ===
                                                              "picked-up"
                                                            ? "Picked Up"
                                                            : "On-Going"}
                                                    </Badge>
                                                </div>
                                                <Separator className="my-2" />
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <User className="h-4 w-4" />
                                                        <p>
                                                            <strong>
                                                                Donor:
                                                            </strong>{" "}
                                                            {
                                                                order.donorUsername
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <User className="h-4 w-4" />
                                                        <p>
                                                            <strong>
                                                                User:
                                                            </strong>{" "}
                                                            {order.userUsername}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <MapPin className="h-4 w-4" />
                                                        <HoverCard>
                                                            <HoverCardTrigger className="cursor-help">
                                                                <p>
                                                                    <strong>
                                                                        Pickup:
                                                                    </strong>{" "}
                                                                    {
                                                                        order.pickupLocation
                                                                    }
                                                                </p>
                                                            </HoverCardTrigger>
                                                            <HoverCardContent>
                                                                <p>
                                                                    <strong>
                                                                        Coordinates:
                                                                    </strong>{" "}
                                                                    {order.pickupLocationCoordinates.coordinates.join(
                                                                        ", "
                                                                    )}
                                                                </p>
                                                            </HoverCardContent>
                                                        </HoverCard>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <MapPin className="h-4 w-4" />
                                                        <p>
                                                            <strong>
                                                                Delivery:
                                                            </strong>{" "}
                                                            {
                                                                order.deliveryLocation
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-2 col-span-2">
                                                        <TruckIcon className="h-4 w-4" />
                                                        <p>
                                                            <strong>
                                                                Delivery Boy:
                                                            </strong>{" "}
                                                            {
                                                                order.deliveryBoyName
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center p-4">
                                        <p className="text-gray-500">
                                            No assigned orders found.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
