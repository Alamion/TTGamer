import clsx from 'clsx';

import type { SharingServiceId } from './services';
import { sharingServiceOf } from './services';

/** Logo marks traced from `static/img/<service>-icon.svg`, drawn inline so their fill can change. */
interface Logo {
    viewBox: [number, number, number, number];
    path: string;
    /** The "character data included" ring: center and radius in viewBox units. */
    ring: { cx: number; cy: number; r: number; width: number };
}

const LOGOS: Record<SharingServiceId, Logo> = {
    discord: {
        viewBox: [0, -28.5, 256, 256],
        // Wider than the frame on purpose: only its corner arcs show.
        ring: { cx: 128, cy: 100, r: 150, width: 16 },
        path: 'M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z',
    },
    matrix: {
        viewBox: [0, 0, 24, 24],
        // Discord's proportions (radius 150/128 of the half frame, stroke 1/16 of the frame):
        // the ring overflows and only its corner arcs show.
        ring: { cx: 12, cy: 12, r: 14.0625, width: 1.5 },
        path: 'M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v4.966H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z',
    },
};

interface ServiceLogoProps {
    service: SharingServiceId;
    /** Sharing is on: the mark takes the service color. */
    active: boolean;
    /** Character data is included: the ring is green. */
    ringed: boolean;
    size?: number;
}

export function ServiceLogo({ service, active, ringed, size = 18 }: ServiceLogoProps) {
    const { viewBox, path, ring } = LOGOS[service];
    return (
        <svg
            width={size}
            height={size}
            viewBox={viewBox.join(' ')}
            preserveAspectRatio="xMidYMid"
            aria-hidden="true"
            data-service={service}
        >
            <circle
                cx={ring.cx}
                cy={ring.cy}
                r={ring.r}
                fill="none"
                stroke={ringed ? '#00c832' : 'currentColor'}
                strokeWidth={ring.width}
                className={clsx(!ringed && 'opacity-40')}
            />
            <path
                d={path}
                fill={active ? sharingServiceOf(service).color : 'currentColor'}
                className={clsx(!active && 'opacity-40')}
            />
        </svg>
    );
}
