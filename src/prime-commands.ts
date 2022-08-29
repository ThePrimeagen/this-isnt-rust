
const COMMAND = "ThePrimeagen:!";
export function is_prime_command(msg: string): boolean {
    return msg.startsWith("ThePrimeagen: !");
}

export function get_command(msg: string): string | null {
    return is_prime_command(msg) && msg.substring(COMMAND.length) || null;
}

