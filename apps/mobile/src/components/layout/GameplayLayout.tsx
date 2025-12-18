import MobileFrame from "./MobileFrame";

interface GameplayLayoutProps {
    children: React.ReactNode;
}

/**
 * Full-screen layout for gameplay pages.
 * Uses MobileFrame but without header and bottom navigation
 * for an immersive game experience.
 */
const GameplayLayout = ({ children }: GameplayLayoutProps) => {
    return (
        <MobileFrame
            content={children}
        // No header or bottomNav for immersive gameplay
        />
    );
};

export default GameplayLayout;
